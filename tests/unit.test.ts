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

console.log("\n✨ All unit and static guard tests passed successfully!");
