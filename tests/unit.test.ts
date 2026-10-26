import fs from "fs";
import path from "path";
import ts from "typescript";
import {
  rruleToFrequency,
  frequencyToRrule,
  getRecurrenceLabel,
  parseExdates,
  computeEventTimes,
  computeDurationMinutes,
  expandRecurringEvents,
  formatLocalDate,
  BaseCalendarEventItem,
} from "./../src/lib/recurrence";
import {
  parseMemberIds,
  getEventColors,
  getEventBackgroundStyle,
  getEventSortKey,
  compareEventsByTime,
  parseEventTimeMinutes,
  layoutDayEvents,
  CalendarEvent,
} from "./../src/components/calendar-view";
import {
  escapeIcsText,
  unescapeIcsText,
  foldIcsLine,
  formatIcsDateTime,
  formatIcsAllDayEndExclusive,
  filterEventsForTimeWindow,
  generateIcsCalendar,
  buildGoogleCalendarTemplateUrl,
  parseIcsDate,
  parseIcsDurationMinutes,
  parseIcsCalendar,
} from "./../src/lib/ics";
import {
  generateCometCode,
  generateCometSlug,
  normalizeJoinCode,
} from "./../src/db/schema";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ Passed: ${message}`);
  }
}

/**
 * Inspects a TypeScript/TSX source string using the TypeScript compiler AST
 * and detects any React Hook (`use*`) called after an early `return` statement
 * within the same component/function body (React Rules of Hooks violation).
 */
export function findHooksAfterEarlyReturn(
  sourceText: string,
  fileName: string = "component.tsx"
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const violations: string[] = [];

  function isHookCall(node: ts.Node): string | null {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && /^use[A-Z0-9]/.test(expr.text)) {
        return expr.text;
      }
      if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === "React" &&
        /^use[A-Z0-9]/.test(expr.name.text)
      ) {
        return `React.${expr.name.text}`;
      }
    }
    return null;
  }

  function statementContainsReturn(stmt: ts.Statement): boolean {
    if (ts.isReturnStatement(stmt)) return true;
    if (ts.isIfStatement(stmt)) {
      return (
        statementContainsReturn(stmt.thenStatement) ||
        (stmt.elseStatement ? statementContainsReturn(stmt.elseStatement) : false)
      );
    }
    if (ts.isBlock(stmt)) {
      return stmt.statements.some(statementContainsReturn);
    }
    return false;
  }

  function findHookCallsInStatement(stmt: ts.Statement): { hookName: string; line: number }[] {
    const found: { hookName: string; line: number }[] = [];

    function walkExpr(node: ts.Node) {
      // Do not descend into nested function declarations/expressions/arrows
      // because those have their own execution scope (e.g., event handlers or sub-render helpers).
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)
      ) {
        return;
      }
      const hook = isHookCall(node);
      if (hook) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        found.push({ hookName: hook, line: line + 1 });
      }
      ts.forEachChild(node, walkExpr);
    }

    walkExpr(stmt);
    return found;
  }

  function checkFunctionBody(body: ts.Block, fnName: string) {
    let seenEarlyReturnAtLine: number | null = null;

    for (const stmt of body.statements) {
      const hooksInStmt = findHookCallsInStatement(stmt);
      if (seenEarlyReturnAtLine !== null && hooksInStmt.length > 0) {
        for (const h of hooksInStmt) {
          violations.push(
            `${fileName}:${h.line} — Hook '${h.hookName}' in '${fnName}' is called after an early return at line ${seenEarlyReturnAtLine}`
          );
        }
      }

      if (seenEarlyReturnAtLine === null && statementContainsReturn(stmt)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
        seenEarlyReturnAtLine = line + 1;
      }
    }
  }

  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)) &&
      node.body &&
      ts.isBlock(node.body)
    ) {
      let fnName = "anonymous";
      if (ts.isFunctionDeclaration(node) && node.name) {
        fnName = node.name.text;
      } else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        fnName = node.parent.name.text;
      }
      checkFunctionBody(node.body, fnName);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log("====================================================");
console.log("🧪 1. Testing React Rules of Hooks AST Guard");
console.log("====================================================");

// 1a. Verify the AST guard catches a synthetic hook-after-early-return bug
const brokenComponentSnippet = `
export function BrokenEventModal({ isOpen }: { isOpen: boolean }) {
  const [title, setTitle] = useState("");
  if (!isOpen) return null;
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  return <div>{title}</div>;
}
`;
const syntheticViolations = findHooksAfterEarlyReturn(brokenComponentSnippet, "BrokenEventModal.tsx");
assert(
  syntheticViolations.length === 1 && syntheticViolations[0].includes("useState"),
  "AST guard detects useState hook called after 'if (!isOpen) return null'"
);

// 1b. Scan all source files in src/ to guarantee zero hook-ordering violations
const srcDir = path.resolve(process.cwd(), "src");
const allSrcFiles = collectTsxFiles(srcDir);
assert(allSrcFiles.length > 15, `Scanned ${allSrcFiles.length} source files in src/`);

const codebaseViolations: string[] = [];
for (const filePath of allSrcFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const relPath = path.relative(process.cwd(), filePath);
  const fileViolations = findHooksAfterEarlyReturn(content, relPath);
  codebaseViolations.push(...fileViolations);
}

if (codebaseViolations.length > 0) {
  console.error("React Rules of Hooks violations detected:\n" + codebaseViolations.join("\n"));
}
assert(
  codebaseViolations.length === 0,
  "Zero React Rules of Hooks (hook after early return) violations across all src/ files"
);

console.log("\n====================================================");
console.log("🧪 2. Testing RRULE & Recurrence Engine");
console.log("====================================================");

assert(rruleToFrequency("FREQ=DAILY") === "daily", "daily rrule");
assert(rruleToFrequency("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR") === "weekday", "weekday rrule");
assert(rruleToFrequency("FREQ=WEEKLY") === "weekly", "weekly rrule");
assert(rruleToFrequency("FREQ=WEEKLY;INTERVAL=2") === "biweekly", "biweekly rrule");
assert(rruleToFrequency("FREQ=MONTHLY") === "monthly", "monthly rrule");
assert(rruleToFrequency(null) === "none", "null rrule");
assert(frequencyToRrule("weekly") === "FREQ=WEEKLY", "weekly freq to rrule");
assert(frequencyToRrule("biweekly") === "FREQ=WEEKLY;INTERVAL=2", "biweekly freq to rrule");
assert(getRecurrenceLabel("FREQ=WEEKLY;INTERVAL=2") === "Repeats every 2 weeks", "biweekly recurrence label");
assert(
  JSON.stringify(parseExdates('["2026-10-15","2026-10-29"]')) ===
    JSON.stringify(["2026-10-15", "2026-10-29"]),
  "parseExdates parses JSON array string"
);
assert(
  JSON.stringify(parseExdates("2026-10-15, 2026-10-29")) ===
    JSON.stringify(["2026-10-15", "2026-10-29"]),
  "parseExdates parses comma-separated string"
);

console.log("\n====================================================");
console.log("🧪 3. Testing Event Times & Duration (Zero Drift)");
console.log("====================================================");

const { startTimeISO, endTimeISO } = computeEventTimes("2026-10-14", "09:00", 60, false);
assert(startTimeISO === "2026-10-14T09:00:00", "startTimeISO matches local 9:00 AM");
assert(endTimeISO === "2026-10-14T10:00:00", "endTimeISO matches local 10:00 AM");
assert(computeDurationMinutes(startTimeISO, endTimeISO) === 60, "duration is exactly 60 mins");

const fifteenMin = computeEventTimes("2026-10-14", "14:30", 15, false);
assert(fifteenMin.startTimeISO === "2026-10-14T14:30:00", "15m startTime");
assert(fifteenMin.endTimeISO === "2026-10-14T14:45:00", "15m endTime");
assert(
  computeDurationMinutes(fifteenMin.startTimeISO, fifteenMin.endTimeISO) === 15,
  "15m duration is exactly 15 mins"
);

const allDayTimes = computeEventTimes("2026-10-14", "09:00", 60, true);
assert(allDayTimes.startTimeISO === "2026-10-14T00:00:00", "all-day start is 00:00:00");
assert(allDayTimes.endTimeISO === "2026-10-14T23:59:59", "all-day end is 23:59:59");
assert(formatLocalDate(new Date(2026, 9, 11)) === "2026-10-11", "formatLocalDate formats local YYYY-MM-DD");

console.log("\n====================================================");
console.log("🧪 4. Testing Recurring Expansion & Exdates");
console.log("====================================================");

const rangeStart = new Date(2026, 9, 1); // Oct 1, 2026 (Thursday)
const rangeEnd = new Date(2026, 9, 7);   // Oct 7, 2026 (Wednesday)
const monthEnd = new Date(2026, 9, 31);  // Oct 31, 2026

const dailyEvent: BaseCalendarEventItem = {
  id: "evt-daily",
  date: "2026-10-01",
  time: "08:00 AM",
  startTime: "2026-10-01T08:00:00",
  endTime: "2026-10-01T08:30:00",
  rrule: "FREQ=DAILY",
  title: "Morning Walk",
};

const expandedDaily = expandRecurringEvents([dailyEvent], rangeStart, rangeEnd);
assert(expandedDaily.length === 7, `Expected 7 daily occurrences, got ${expandedDaily.length}`);
assert(expandedDaily[0].id === "evt-daily", "First occurrence preserves original id");
assert(expandedDaily[1].id === "evt-daily_2026-10-02", "Second occurrence has date-suffixed id");
assert(expandedDaily[1].baseEventId === "evt-daily", "Occurrence preserves baseEventId");

const weekdayEvent: BaseCalendarEventItem = {
  id: "evt-weekday",
  date: "2026-10-01",
  time: "09:00 AM",
  startTime: "2026-10-01T09:00:00",
  endTime: "2026-10-01T10:00:00",
  rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  title: "School Dropoff",
};
const expandedWeekday = expandRecurringEvents([weekdayEvent], rangeStart, rangeEnd);
assert(expandedWeekday.length === 5, `Expected 5 weekday occurrences, got ${expandedWeekday.length}`);

const weeklyEvent: BaseCalendarEventItem = {
  id: "evt-weekly",
  date: "2026-10-01",
  time: "04:00 PM",
  startTime: "2026-10-01T16:00:00",
  endTime: "2026-10-01T17:00:00",
  rrule: "FREQ=WEEKLY",
  title: "Soccer Practice",
};
const expandedWeekly = expandRecurringEvents([weeklyEvent], rangeStart, monthEnd);
assert(expandedWeekly.length === 5, `Expected 5 weekly occurrences in Oct, got ${expandedWeekly.length}`);

const biweeklyEvent: BaseCalendarEventItem = {
  id: "evt-payday",
  date: "2026-10-01",
  time: "09:00 AM",
  startTime: "2026-10-01T09:00:00",
  endTime: "2026-10-01T09:30:00",
  rrule: "FREQ=WEEKLY;INTERVAL=2",
  title: "Biweekly Payday Orbit",
};
const expandedBiweekly = expandRecurringEvents([biweeklyEvent], rangeStart, monthEnd);
assert(expandedBiweekly.length === 3, `Expected 3 biweekly occurrences in Oct, got ${expandedBiweekly.length}`);
assert(expandedBiweekly[0].date === "2026-10-01", "Biweekly occurrence 1 is Oct 1");
assert(expandedBiweekly[1].date === "2026-10-15", "Biweekly occurrence 2 is Oct 15");
assert(expandedBiweekly[2].date === "2026-10-29", "Biweekly occurrence 3 is Oct 29");

const biweeklyWithExdate: BaseCalendarEventItem = {
  ...biweeklyEvent,
  exdates: ["2026-10-15"],
};
const expandedWithExdate = expandRecurringEvents([biweeklyWithExdate], rangeStart, monthEnd);
assert(expandedWithExdate.length === 2, `Expected 2 occurrences after exdate exclusion, got ${expandedWithExdate.length}`);
assert(expandedWithExdate.every((e) => e.date !== "2026-10-15"), "Excluded occurrence Oct 15 is omitted");

console.log("\n====================================================");
console.log("🧪 5. Testing Calendar View Multi-Member & Layout Helpers");
console.log("====================================================");

assert(
  JSON.stringify(parseMemberIds('["mem_leo","mem_mia"]')) === JSON.stringify(["mem_leo", "mem_mia"]),
  "parseMemberIds parses JSON array"
);
const mockInhabitants = [
  { id: "mem_leo", color: "#8b5cf6" },
  { id: "mem_mia", color: "#f59e0b" },
];
const multiColors = getEventColors({ memberIds: ["mem_leo", "mem_mia"] }, mockInhabitants, "#ef4444");
assert(
  JSON.stringify(multiColors) === JSON.stringify(["#8b5cf6", "#f59e0b"]),
  "getEventColors resolves multiple inhabitant colors"
);
const familyColors = getEventColors({ memberIds: [] }, mockInhabitants, "#ef4444");
assert(familyColors[0] === "#ef4444", "getEventColors falls back to Whole-Family color when unassigned");

const splitBg = getEventBackgroundStyle(["#8b5cf6", "#f59e0b"], "30");
assert(splitBg.background.includes("linear-gradient"), "2-member event generates diagonal split gradient");

const sampleTimedEvents: CalendarEvent[] = [
  {
    id: "evt-1",
    memberId: "mem_leo",
    title: "Overlap A",
    date: "2026-10-14",
    time: "10:00 AM",
    startTime: "2026-10-14T10:00:00",
    endTime: "2026-10-14T11:00:00",
    duration: "1 hr",
    color: "#8b5cf6",
  },
  {
    id: "evt-2",
    memberId: "mem_mia",
    title: "Overlap B",
    date: "2026-10-14",
    time: "10:30 AM",
    startTime: "2026-10-14T10:30:00",
    endTime: "2026-10-14T11:30:00",
    duration: "1 hr",
    color: "#f59e0b",
  },
];
const positioned = layoutDayEvents(sampleTimedEvents, 64);
assert(positioned.length === 2, "layoutDayEvents positions both overlapping timed events");
assert(positioned[0].totalCols === 2 && positioned[1].totalCols === 2, "Overlapping events are placed in 2 columns");
assert(positioned[0].colIndex === 0 && positioned[1].colIndex === 1, "Overlapping events receive distinct column indices");
assert(getEventSortKey({ ...sampleTimedEvents[0], isAllDay: true }) === -1, "All-day events sort first (-1)");
assert(compareEventsByTime(sampleTimedEvents[0], sampleTimedEvents[1]) < 0, "10:00 AM sorts before 10:30 AM");
assert(parseEventTimeMinutes(sampleTimedEvents[0]).startMinutes === 600, "10:00 AM parses to 600 minutes");

console.log("\n====================================================");
console.log("🧪 6. Testing Two-Row Mobile KioskHeader Structure");
console.log("====================================================");

const kioskHeaderPath = path.resolve(__dirname, "../src/components/kiosk-header.tsx");
const kioskHeaderSource = fs.readFileSync(kioskHeaderPath, "utf-8");

assert(
  kioskHeaderSource.includes("flex-col md:flex-row"),
  "KioskHeader uses flex-col on mobile and md:flex-row on desktop for two-row mobile layout"
);
assert(
  kioskHeaderSource.includes('data-testid="kiosk-header-row-1"') &&
    kioskHeaderSource.includes('data-testid="kiosk-header-row-2"'),
  "KioskHeader defines distinct row-1 and row-2 containers for mobile mode"
);
assert(
  !kioskHeaderSource.includes("<span>{accessMode} Mode</span>"),
  "KioskHeader omits legacy PIN/Access Mode gate button in favor of direct editing"
);
assert(
  kioskHeaderSource.includes('data-testid="kiosk-clock-display"') &&
    kioskHeaderSource.includes("hidden sm:flex"),
  "KioskHeader hides redundant kiosk clock on <640px mobile phones where OS clock is visible"
);
assert(
  kioskHeaderSource.includes('data-testid="theme-picker-backdrop"') &&
    kioskHeaderSource.includes("fixed inset-0 bg-black/75 backdrop-blur-sm z-50 md:hidden"),
  "KioskHeader renders dedicated backdrop overlay for mobile theme picker modal dismissal"
);
assert(
  kioskHeaderSource.includes("w-full max-w-sm sm:max-w-md my-auto") &&
    kioskHeaderSource.includes("max-h-[85vh] overflow-y-auto"),
  "KioskHeader theme picker modal uses vertical auto-margins and viewport height constraints to prevent top clipping on mobile"
);
assert(
  kioskHeaderSource.includes("hidden md:block absolute top-12 right-0") &&
    kioskHeaderSource.includes("w-80 lg:w-96"),
  "KioskHeader theme picker reverts to localized absolute dropdown below button on desktop"
);
assert(
  kioskHeaderSource.includes('aria-label="Close Theme Studio"'),
  "KioskHeader theme picker modal provides accessible close button"
);

console.log("\n====================================================");
console.log("🧪 7. Testing Mobile Redesign (Split Month Agenda, FABs, Unified Chores Strip)");
console.log("====================================================");

const calendarViewPath = path.resolve(__dirname, "../src/components/calendar-view.tsx");
const calendarViewSource = fs.readFileSync(calendarViewPath, "utf-8");

assert(
  calendarViewSource.includes('data-testid="calendar-toolbar-row-1"') &&
    calendarViewSource.includes('data-testid="calendar-toolbar-row-2"'),
  "CalendarView condenses top controls into a 2-row toolbar (row-1 and row-2)"
);
assert(
  calendarViewSource.includes('data-testid="mobile-month-agenda"') &&
    calendarViewSource.includes("selectedAgendaDate"),
  "CalendarView renders a Split Month + Live Agenda lower pane on mobile (<640px)"
);
assert(
  calendarViewSource.includes('data-testid="mobile-add-event-fab"'),
  "CalendarView renders a thumb-zone Floating Action Button (FAB) for adding events on mobile"
);
assert(
  calendarViewSource.includes("sticky left-0 z-20"),
  "CalendarView Week View pins the Time Axis column with sticky left-0 z-20 during horizontal scroll"
);

const choresViewPath = path.resolve(__dirname, "../src/components/chores-view.tsx");
const choresViewSource = fs.readFileSync(choresViewPath, "utf-8");

assert(
  choresViewSource.includes('data-testid="chores-unified-filter-strip"'),
  "ChoresView combines member filter chips and star balances into a unified interactive strip"
);
assert(
  choresViewSource.includes('data-testid="mobile-add-chore-fab"'),
  "ChoresView renders a thumb-zone Floating Action Button (FAB) for adding chores on mobile"
);

// ==========================================
// 8. Testing Agent Auth & Bot Wall Stencil Helpers
// ==========================================
console.log("\n====================================================");
console.log("🧪 8. Testing Agent Auth & Bot Wall Stencil Helpers");
console.log("====================================================");

const {
  generateAgentPat,
  generateDeviceHandshakeCodes,
  hashSecret,
  isValidStencil16,
  decodeStencil16ToGrid,
  encodeGridToStencil16,
  sanitizeRune,
  STENCIL_PRESETS,
} = require("../src/lib/agent-auth");

// PAT Generation
const pat1 = generateAgentPat();
assert(pat1.rawToken.startsWith("jlight_ag_"), "PAT token starts with jlight_ag_ prefix");
assert(pat1.tokenHash === hashSecret(pat1.rawToken), "tokenHash is SHA-256 of rawToken");
assert(pat1.keyPrefix.startsWith("jlight_ag_"), "keyPrefix contains prefix");

// Device Handshake Codes
const hs = generateDeviceHandshakeCodes();
assert(hs.deviceCode.startsWith("jlight_dc_"), "deviceCode starts with jlight_dc_");
assert(/^BOT-\d{4}$/.test(hs.userCode), "userCode matches BOT-XXXX format");

// Stencil validation & roundtrip
assert(isValidStencil16(STENCIL_PRESETS.robot.hex), "Robot stencil hex is valid 64-char");
assert(!isValidStencil16("123"), "Short hex string is invalid stencil");
assert(!isValidStencil16(null), "Null is invalid stencil");

const robotGrid = decodeStencil16ToGrid(STENCIL_PRESETS.robot.hex);
assert(robotGrid.length === 16, "Grid has 16 rows");
assert(robotGrid[0].length === 16, "Grid has 16 columns");
const reEncoded = encodeGridToStencil16(robotGrid);
assert(reEncoded.toLowerCase() === STENCIL_PRESETS.robot.hex.toLowerCase(), "Roundtrip encode/decode preserves stencil hex");

// Rune Sanitization
assert(sanitizeRune("⚡") === "⚡", "Sanitizes rune emoji");
assert(sanitizeRune("") === "◈", "Empty string defaults to ◈");
assert(sanitizeRune(null) === "◈", "Null defaults to ◈");
assert(sanitizeRune("anything", true) === "∅", "Buffed status produces ∅");

// ==========================================
// 9. Testing High-Entropy CSPRNG Join Code Generation & Normalization
// ==========================================
console.log("\n====================================================");
console.log("🧪 9. Testing High-Entropy CSPRNG Join Code Generation & Normalization");
console.log("====================================================");

const { generateJoinCode, normalizeJoinCode } = require("../src/db/schema");

const code1 = generateJoinCode();
assert(
  /^GLX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code1),
  `Join code matches 8-char format GLX-XXXX-XXXX (got ${code1})`
);
assert(code1.length === 13, "Join code total string length is 13 characters");

const sampleCodes = new Set();
for (let i = 0; i < 50; i++) {
  sampleCodes.add(generateJoinCode());
}
assert(sampleCodes.size === 50, "50 randomly generated join codes are strictly unique");

assert(
  normalizeJoinCode("8P9A2M4K") === "GLX-8P9A-2M4K",
  "normalizeJoinCode adds GLX- and chunks 8 unformatted characters"
);
assert(
  normalizeJoinCode("GLX8P9A2M4K") === "GLX-8P9A-2M4K",
  "normalizeJoinCode formats GLX-prefixed 8 unhyphenated characters"
);
assert(
  normalizeJoinCode("glx-8p9a-2m4k") === "GLX-8P9A-2M4K",
  "normalizeJoinCode uppercases lowercase hyphenated code"
);
assert(
  normalizeJoinCode("GLX7SZXX") === "GLX-7SZXX",
  "normalizeJoinCode preserves legacy 5-char codes"
);

// ==========================================
// 10. Testing Material Archetype Theme Engine & Hue-Preserving Member Colors
// ==========================================
console.log("\n====================================================");
console.log("🧪 10. Testing Material Archetype Theme Engine & Hue-Preserving Member Colors");
console.log("====================================================");

const {
  THEME_OPTIONS,
  resolveTheme,
  getThemeOption,
  adaptMemberColor,
} = require("../src/lib/theme");

assert(
  Array.isArray(THEME_OPTIONS) && THEME_OPTIONS.length === 9,
  `THEME_OPTIONS exposes all 9 curated palettes (got ${THEME_OPTIONS?.length})`
);

const expectedThemes = [
  "mocha",
  "matcha",
  "oat",
  "latte",
  "over-volt-blue",
  "yakuza-purple",
  "red-dragon",
  "neon-green",
  "halloween",
];
for (const tid of expectedThemes) {
  const opt = getThemeOption(tid);
  assert(opt.id === tid, `getThemeOption('${tid}') resolves matching palette`);
  // Mother-Color Invariant: No pure #000000 or #ffffff in any palette token
  for (const [tokenKey, hexVal] of Object.entries(opt.palette)) {
    const lower = String(hexVal).toLowerCase();
    assert(
      lower !== "#000000" && lower !== "#ffffff",
      `Theme '${tid}' token '${tokenKey}' obeys Mother-Color rule (no pure black/white, got ${hexVal})`
    );
  }
}

assert(
  resolveTheme("milky-way") === "mocha",
  "Legacy 'milky-way' theme ID gracefully aliases to 'mocha'"
);
assert(
  resolveTheme("halloween") === "halloween",
  "'halloween' resolves to reworked All Hallows OSL theme"
);
assert(
  resolveTheme("unknown-theme") === "mocha",
  "Unknown theme ID falls back to 'mocha'"
);

// Hue-preserving member color adaptation check
function hexToHue(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

const rawEmerald = "#10b981"; // Family member green
const rawHue = hexToHue(rawEmerald);

const mochaGreen = adaptMemberColor(rawEmerald, "mocha");
const latteGreen = adaptMemberColor(rawEmerald, "latte");
const oslGreen = adaptMemberColor(rawEmerald, "over-volt-blue");

assert(
  hueDistance(rawHue, hexToHue(mochaGreen)) < 18,
  `Creamy Dark ('mocha') preserves green semantic hue (${rawEmerald} -> ${mochaGreen})`
);
assert(
  hueDistance(rawHue, hexToHue(latteGreen)) < 18,
  `Creamy Daylight ('latte') preserves green semantic hue (${rawEmerald} -> ${latteGreen})`
);
assert(
  hueDistance(rawHue, hexToHue(oslGreen)) < 18,
  `Cyberpunk OSL ('over-volt-blue') preserves green semantic hue (${rawEmerald} -> ${oslGreen})`
);
assert(
  mochaGreen !== latteGreen && latteGreen !== oslGreen,
  `Member color materiality adapts distinctly across Creamy Dark (${mochaGreen}), Daylight (${latteGreen}), and OSL (${oslGreen})`
);

console.log("\n====================================================");
console.log("☄️  7. Testing Ephemeral Comet Codes & RFC 5545 .ics Portability");
console.log("====================================================");

const cometCode = generateCometCode();
assert(
  /^CMT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/.test(cometCode),
  `generateCometCode() produces valid CMT-XXXX-XXXX format (${cometCode})`
);
assert(
  normalizeJoinCode("cmt8p9a2m4k") === "CMT-8P9A-2M4K",
  "normalizeJoinCode() normalizes unhyphenated CMT code to CMT-8P9A-2M4K"
);
const cometSlug = generateCometSlug("Q4 Product Launch & Sync!");
assert(
  cometSlug.startsWith("q4-product-launch-sync-") && cometSlug.length > 24,
  `generateCometSlug() generates URL-safe slug (${cometSlug})`
);

assert(
  escapeIcsText("Meeting; Room A, Floor 2\nBring notes") ===
    "Meeting\\; Room A\\, Floor 2\\nBring notes",
  "escapeIcsText() escapes semicolons, commas, and newlines per RFC 5545"
);

const longLine = "DESCRIPTION:" + "A".repeat(100);
const folded = foldIcsLine(longLine);
assert(
  folded.includes("\r\n ") && folded.split("\r\n")[0].length === 75,
  "foldIcsLine() folds lines > 75 chars with CRLF + space"
);

assert(
  formatIcsDateTime("2026-10-25T14:30:00", false) === "20261025T143000",
  "formatIcsDateTime() formats timed ISO event to YYYYMMDDTHHMMSS"
);
assert(
  formatIcsDateTime("2026-10-25T00:00:00", true) === "20261025" &&
    formatIcsAllDayEndExclusive("2026-10-25T23:59:59") === "20261026",
  "All-day .ics DTSTART/DTEND uses exclusive next-day end date (20261025 -> 20261026)"
);

const sampleIcsEvents = [
  {
    id: "evt_kickoff",
    title: "Sprint Kickoff, Team A",
    description: "Align on Q4 deliverables",
    location: "Zoom / Orbit Room",
    startTime: "2026-11-02T10:00:00",
    endTime: "2026-11-02T11:00:00",
    isAllDay: false,
    memberId: "mem_alex",
  },
  {
    id: "evt_standup",
    title: "Daily Standup",
    startTime: "2026-11-02T09:00:00",
    endTime: "2026-11-02T09:15:00",
    isAllDay: false,
    rrule: "FREQ=DAILY",
    exdates: ["2026-11-04"],
    memberId: "mem_alex",
  },
  {
    id: "evt_outside",
    title: "December Retro",
    startTime: "2026-12-15T15:00:00",
    endTime: "2026-12-15T16:00:00",
    isAllDay: false,
    memberId: "mem_sam",
  },
];

const windowExpanded = filterEventsForTimeWindow(sampleIcsEvents, {
  startDate: "2026-11-02",
  endDate: "2026-11-05",
  mode: "expanded",
});
// Kickoff on Nov 2 + Daily Standup on Nov 2, Nov 3, Nov 5 (Nov 4 excluded via exdates!) = 4 events; Dec 15 excluded
assert(
  windowExpanded.length === 4 &&
    !windowExpanded.some((e) => e.startTime.startsWith("2026-11-04")) &&
    !windowExpanded.some((e) => e.id === "evt_outside"),
  `filterEventsForTimeWindow() expands recurring events inside [2026-11-02, 2026-11-05] and respects exdates (got ${windowExpanded.length})`
);

const icsDoc = generateIcsCalendar(sampleIcsEvents, {
  calendarName: "Q4 Sprint Comet",
  startDate: "2026-11-02",
  endDate: "2026-11-05",
  mode: "expanded",
  participants: [{ id: "mem_alex", displayName: "Alex" }],
});

assert(
  icsDoc.startsWith("BEGIN:VCALENDAR\r\n") &&
    icsDoc.includes("X-WR-CALNAME:Q4 Sprint Comet\r\n") &&
    icsDoc.includes("SUMMARY:Sprint Kickoff\\, Team A\r\n") &&
    icsDoc.includes("CATEGORIES:Alex\r\n") &&
    icsDoc.trimEnd().endsWith("END:VCALENDAR"),
  "generateIcsCalendar() emits valid RFC 5545 VCALENDAR with escaped summaries and participant categories"
);

const gcalUrl = buildGoogleCalendarTemplateUrl(sampleIcsEvents[0]);
assert(
  gcalUrl.startsWith("https://calendar.google.com/calendar/render?") &&
    gcalUrl.includes("dates=20261102T100000%2F20261102T110000"),
  "buildGoogleCalendarTemplateUrl() generates valid 1-click Google Calendar template link"
);

// Unescaping
assert(
  unescapeIcsText("Line 1\\nLine 2\\, with comma\\; and semicolon\\\\backslash") ===
    "Line 1\nLine 2, with comma; and semicolon\\backslash",
  "unescapeIcsText() unescapes newlines, commas, semicolons, and backslashes per RFC 5545"
);

// Date parsing
const parsedAllDayDate = parseIcsDate("20261025", { VALUE: "DATE" });
assert(
  parsedAllDayDate.isAllDay === true &&
    parsedAllDayDate.dateStr === "2026-10-25" &&
    parsedAllDayDate.isoString === "2026-10-25T00:00:00",
  "parseIcsDate() parses 8-digit date with VALUE=DATE as all-day"
);

const parsedTimedDate = parseIcsDate("20261025T143000Z");
assert(
  parsedTimedDate.isAllDay === false &&
    parsedTimedDate.dateStr === "2026-10-25" &&
    parsedTimedDate.isoString === "2026-10-25T14:30:00",
  "parseIcsDate() parses UTC datetime to ISO format"
);

// Duration parsing
assert(
  parseIcsDurationMinutes("PT1H30M") === 90 &&
    parseIcsDurationMinutes("PT45M") === 45 &&
    parseIcsDurationMinutes("P1D") === 1440,
  "parseIcsDurationMinutes() parses hours, minutes, and days to minutes"
);

// Calendar parsing
const sampleIcsContent = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Sample Org//Test Calendar//EN",
  "X-WR-CALNAME:Starlight Academy Schedule",
  "X-WR-CALDESC:School terms and events",
  "BEGIN:VEVENT",
  "UID:school_gym_001@academy.org",
  "SUMMARY:Gym Class\\, 5th Grade",
  "DESCRIPTION:Bring sneakers and water bottle.\\nLockers provided.",
  "LOCATION:Gymnasium B",
  "URL:https://academy.org/gym",
  "STATUS:CONFIRMED",
  "PRIORITY:1",
  "TRANSP:OPAQUE",
  "CLASS:PUBLIC",
  "GEO:37.386013;-122.082932",
  "ORGANIZER;CN=Coach Carter:mailto:carter@academy.org",
  "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Leo:mailto:leo@jlight.test",
  "DTSTART:20261103T133000",
  "DTEND:20261103T143000",
  "CATEGORIES:School,Physical Education",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:school_holiday_002@academy.org",
  "SUMMARY:Veterans Day Observance",
  "DTSTART;VALUE=DATE:20261111",
  "DTEND;VALUE=DATE:20261112",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:school_band_003@academy.org",
  "SUMMARY:Weekly Band Practice",
  "DTSTART:20261104T153000",
  "DURATION:PT1H",
  "RRULE:FREQ=WEEKLY;BYDAY=WE",
  "EXDATE:20261125T153000",
  "BEGIN:VALARM",
  "ACTION:DISPLAY",
  "DESCRIPTION:Reminder",
  "TRIGGER:-PT15M",
  "END:VALARM",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const parsedCal = parseIcsCalendar(sampleIcsContent);
assert(
  parsedCal.calendarName === "Starlight Academy Schedule" &&
    parsedCal.description === "School terms and events" &&
    parsedCal.events.length === 3,
  `parseIcsCalendar() parses calendar metadata and all 3 events (got ${parsedCal.events.length})`
);

const gymEvt = parsedCal.events.find((e) => e.externalUid === "school_gym_001@academy.org");
assert(
  gymEvt !== undefined &&
    gymEvt.title === "Gym Class, 5th Grade" &&
    gymEvt.description === "Bring sneakers and water bottle.\nLockers provided." &&
    gymEvt.location === "Gymnasium B" &&
    gymEvt.startTime === "2026-11-03T13:30:00" &&
    gymEvt.endTime === "2026-11-03T14:30:00" &&
    gymEvt.isAllDay === false &&
    gymEvt.url === "https://academy.org/gym" &&
    gymEvt.status === "CONFIRMED" &&
    gymEvt.priority === 1 &&
    gymEvt.transparency === "OPAQUE" &&
    gymEvt.classification === "PUBLIC" &&
    gymEvt.geo === "37.386013;-122.082932" &&
    gymEvt.organizer?.name === "Coach Carter" &&
    gymEvt.organizer?.email === "carter@academy.org" &&
    gymEvt.attendees?.[0]?.name === "Leo" &&
    gymEvt.attendees?.[0]?.email === "leo@jlight.test" &&
    gymEvt.attendees?.[0]?.status === "ACCEPTED",
  "parseIcsCalendar() parses URL, STATUS, PRIORITY, TRANSP, CLASS, GEO, ORGANIZER, and ATTENDEE"
);

const holidayEvt = parsedCal.events.find((e) => e.externalUid === "school_holiday_002@academy.org");
assert(
  holidayEvt !== undefined &&
    holidayEvt.title === "Veterans Day Observance" &&
    holidayEvt.isAllDay === true &&
    holidayEvt.startTime === "2026-11-11T00:00:00" &&
    holidayEvt.endTime === "2026-11-11T23:59:59",
  "parseIcsCalendar() adjusts exclusive next-day all-day DTEND to inclusive 23:59:59"
);

const bandEvt = parsedCal.events.find((e) => e.externalUid === "school_band_003@academy.org");
assert(
  bandEvt !== undefined &&
    bandEvt.title === "Weekly Band Practice" &&
    bandEvt.rrule === "FREQ=WEEKLY;BYDAY=WE" &&
    Array.isArray(bandEvt.exdates) &&
    bandEvt.exdates.includes("2026-11-25") &&
    bandEvt.endTime === "2026-11-04T16:30:00" &&
    bandEvt.alarms?.[0]?.trigger === "-PT15M" &&
    bandEvt.alarms?.[0]?.action === "DISPLAY" &&
    bandEvt.alarms?.[0]?.description === "Reminder",
  "parseIcsCalendar() parses DURATION, RRULE, EXDATE, and VALARM"
);

// Round-trip verification: generateIcsCalendar -> parseIcsCalendar
const richEvent = {
  id: "evt_rich",
  title: "Parent Teacher Conference",
  startTime: "2026-11-03T16:00:00",
  endTime: "2026-11-03T16:30:00",
  url: "https://meet.google.com/abc-defg-hij",
  status: "CONFIRMED",
  priority: 2,
  transparency: "OPAQUE",
  classification: "PRIVATE",
  geo: "40.7128;-74.0060",
  organizer: { name: "Principal Vance", email: "vance@school.org" },
  attendees: [{ name: "Alice", email: "alice@jlight.test", status: "ACCEPTED" }],
  alarms: [{ trigger: "-PT30M", action: "DISPLAY", description: "Meeting soon" }],
};

const richDoc = generateIcsCalendar([richEvent], {
  calendarName: "Rich Export",
  startDate: "2026-11-03",
  endDate: "2026-11-03",
});
const richParsed = parseIcsCalendar(richDoc);
assert(
  richParsed.events.length === 1 &&
    richParsed.events[0].url === "https://meet.google.com/abc-defg-hij" &&
    richParsed.events[0].status === "CONFIRMED" &&
    richParsed.events[0].priority === 2 &&
    richParsed.events[0].classification === "PRIVATE" &&
    richParsed.events[0].organizer?.name === "Principal Vance" &&
    richParsed.events[0].attendees?.[0]?.name === "Alice" &&
    richParsed.events[0].alarms?.[0]?.trigger === "-PT30M",
  "generateIcsCalendar() and parseIcsCalendar() provide lossless round-trip for all RFC 5545 properties"
);

// Round-trip verification: generateIcsCalendar -> parseIcsCalendar
const roundTripDoc = generateIcsCalendar(sampleIcsEvents, {
  calendarName: "Roundtrip Test",
  startDate: "2026-11-02",
  endDate: "2026-11-05",
  mode: "rrule",
});
const roundTripParsed = parseIcsCalendar(roundTripDoc);
assert(
  roundTripParsed.events.length === 2 &&
    roundTripParsed.events.some((e) => e.title === "Sprint Kickoff, Team A") &&
    roundTripParsed.events.some((e) => e.title === "Daily Standup" && e.rrule?.includes("FREQ=DAILY")),
  "Round-trip RFC 5545 export and import preserves event titles and recurrence rules"
);

// Verification of ImportCalendarModal theme and member color inheritance
const importModalPath = path.resolve(__dirname, "../src/components/import-calendar-modal.tsx");
assert(fs.existsSync(importModalPath), "import-calendar-modal.tsx exists");
const importModalContent = fs.readFileSync(importModalPath, "utf-8");
assert(
  importModalContent.includes("adaptMemberColor") &&
    importModalContent.includes("useActiveTheme"),
  "ImportCalendarModal imports adaptMemberColor and useActiveTheme"
);
assert(
  importModalContent.includes("borderLeftColor: activeMemberColor") &&
    importModalContent.includes("activeMemberColor"),
  "ImportCalendarModal binds selected member's theme-adapted color to dropdown border and badge"
);
assert(
  !importModalContent.includes("bg-cosmos-canvas"),
  "ImportCalendarModal eliminates invalid bg-cosmos-canvas class in favor of valid theme tokens"
);

// ====================================================
// 🤖 9. Testing CI Code Reviewer Workflow & Small Device UI/UX Lens
// ====================================================
console.log(
  "\n====================================================\n🤖 9. Testing CI Code Reviewer Configuration & UI/UX Lens\n===================================================="
);

const workflowPath = path.resolve(__dirname, "../.github/workflows/code-review.yml");
assert(fs.existsSync(workflowPath), ".github/workflows/code-review.yml exists");
const workflowContent = fs.readFileSync(workflowPath, "utf-8");
assert(
  workflowContent.includes("uses: tomasmed/ci-code-reviewer@master") || workflowContent.includes("uses: tomasmed/ci-code-reviewer@v1"),
  "Workflow invokes tomasmed/ci-code-reviewer@v1 action"
);
assert(
  workflowContent.includes("pull_request:") &&
    workflowContent.includes("pull-requests: write"),
  "Workflow configures pull_request trigger with pull-requests: write permissions"
);

const configPath = path.resolve(__dirname, "../.ci-reviewer.yml");
assert(fs.existsSync(configPath), ".ci-reviewer.yml configuration file exists");
const configContent = fs.readFileSync(configPath, "utf-8");
assert(
  configContent.includes("model:") && (configContent.includes("gemini-3.8-flash") || configContent.includes("gemini-2.0-flash") || configContent.includes("claude-3-5-sonnet")),
  ".ci-reviewer.yml configures default LLM model"
);
assert(
  configContent.includes("small_device_ui_ux"),
  ".ci-reviewer.yml defines dedicated 'small_device_ui_ux' review lens"
);
assert(
  configContent.includes("48px x 48px") &&
    configContent.includes("docs/adr/0013-recurring-events-and-mobile-touch-ux.md"),
  ".ci-reviewer.yml lens checks 48px touch targets and injects ADR 0013 mobile UX context"
);

const markdownLensPath = path.resolve(__dirname, "../.ci-reviewer/lenses/small-device-ui-ux.md");
assert(fs.existsSync(markdownLensPath), ".ci-reviewer/lenses/small-device-ui-ux.md markdown lens exists");
const markdownLensContent = fs.readFileSync(markdownLensPath, "utf-8");
assert(
  markdownLensContent.includes("name: small_device_ui_ux") &&
    markdownLensContent.includes("Lead UI/UX Designer and Mobile Interaction Specialist"),
  "Markdown lens contains frontmatter and specialized UI/UX persona prompt"
);

console.log("\n✨ All unit and static guard tests passed successfully!");


