import {
  expandRecurringEvents,
  parseExdates,
  rruleToFrequency,
  formatLocalDate,
  computeDurationMinutes,
  computeEventTimes,
} from "./recurrence";

export interface IcsExportableEvent {
  id: string;
  baseEventId?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean | number | null;
  rrule?: string | null;
  exdates?: string[] | string | null;
  memberId?: string | null;
  memberIds?: string[] | string | null;
  colorOverride?: string | null;
  url?: string | null;
  status?: string | null;
  priority?: number | null;
  transparency?: string | null;
  classification?: string | null;
  geo?: string | null;
  organizer?: string | { name?: string; email?: string } | null;
  attendees?: string | Array<{ name?: string; email?: string; status?: string; role?: string }> | null;
  alarms?: string | Array<{ trigger?: string; action?: string; description?: string }> | null;
  createdAt?: string | null;
}

export interface IcsParticipantInfo {
  id: string;
  displayName: string;
  role?: string;
}

export interface IcsExportOptions {
  calendarName: string;
  description?: string;
  timezone?: string;
  startDate?: string; // YYYY-MM-DD inclusive
  endDate?: string; // YYYY-MM-DD inclusive
  memberId?: string; // Optional participant filter ("all" or specific memberId)
  mode?: "expanded" | "rrule"; // Default: "expanded" when startDate+endDate are set, "rrule" otherwise
  participants?: IcsParticipantInfo[];
  prodId?: string;
}

export interface ParsedIcsAlarm {
  trigger?: string;
  action?: string;
  description?: string;
}

export interface ParsedIcsAttendee {
  name?: string;
  email?: string;
  status?: string;
  role?: string;
}

export interface ParsedIcsOrganizer {
  name?: string;
  email?: string;
}

export interface ParsedIcsEvent {
  externalUid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string; // ISO format (YYYY-MM-DDTHH:mm:ss)
  endTime: string; // ISO format (YYYY-MM-DDTHH:mm:ss)
  isAllDay: boolean;
  rrule?: string | null;
  exdates?: string[];
  categories?: string[];
  url?: string | null;
  status?: string | null;
  priority?: number | null;
  transparency?: string | null;
  classification?: string | null;
  geo?: string | null;
  organizer?: ParsedIcsOrganizer | null;
  attendees?: ParsedIcsAttendee[];
  alarms?: ParsedIcsAlarm[];
}

export interface ParsedIcsCalendar {
  calendarName?: string;
  description?: string;
  timezone?: string;
  prodId?: string;
  events: ParsedIcsEvent[];
}

/**
 * Escapes text values according to RFC 5545 Section 3.3.11:
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
export function escapeIcsText(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Unescapes RFC 5545 text values:
 * Decodes \n/\N to newline, \, to comma, \; to semicolon, and \\ to backslash.
 */
export function unescapeIcsText(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1");
}

/**
 * Folds a single iCalendar content line at 75 octets/characters using CRLF + space
 * per RFC 5545 Section 3.1.
 */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join("\r\n");
}

/**
 * Extracts YYYY-MM-DD from an ISO date or datetime string.
 */
export function extractEventDateStr(startTime: string): string {
  if (!startTime) return formatLocalDate(new Date());
  if (startTime.includes("T")) {
    return startTime.split("T")[0];
  }
  return startTime.slice(0, 10);
}

/**
 * Formats an ISO string (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD) into RFC 5545 format:
 * - Timed: YYYYMMDDTHHMMSS
 * - All-Day: YYYYMMDD
 */
export function formatIcsDateTime(isoStr: string, isAllDay: boolean = false): string {
  const datePart = extractEventDateStr(isoStr).replace(/-/g, "");
  if (isAllDay) {
    return datePart;
  }
  const timeRaw = isoStr.includes("T") ? isoStr.split("T")[1] : "09:00:00";
  const cleanTime = timeRaw.replace(/Z$/, "").split(".")[0];
  const parts = cleanTime.split(":");
  const hh = (parts[0] || "09").padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  const ss = (parts[2] || "00").padStart(2, "0");
  return `${datePart}T${hh}${mm}${ss}`;
}

/**
 * Computes the RFC 5545 exclusive end date (YYYYMMDD) for an all-day event.
 * In iCalendar, an all-day event on 2026-10-25 has DTSTART;VALUE=DATE:20261025
 * and DTEND;VALUE=DATE:20261026.
 */
export function formatIcsAllDayEndExclusive(endIsoStr: string): string {
  const dateStr = extractEventDateStr(endIsoStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return dateStr.replace(/-/g, "");
  }
  const nextDay = new Date(y, m - 1, d + 1);
  return formatLocalDate(nextDay).replace(/-/g, "");
}

/**
 * Parses memberIds field from DB row (JSON array string or string[]).
 */
function normalizeEventMemberIds(evt: IcsExportableEvent): string[] {
  const set = new Set<string>();
  if (evt.memberId) set.add(evt.memberId);
  if (evt.memberIds) {
    if (Array.isArray(evt.memberIds)) {
      evt.memberIds.forEach((id) => id && set.add(id));
    } else if (typeof evt.memberIds === "string") {
      try {
        const parsed = JSON.parse(evt.memberIds);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => id && set.add(String(id)));
        } else if (evt.memberIds.trim()) {
          set.add(evt.memberIds.trim());
        }
      } catch {
        set.add(evt.memberIds.trim());
      }
    }
  }
  return Array.from(set);
}

/**
 * Filters and optionally expands events within a `[startDate, endDate]` time window
 * and optional `memberId` filter.
 */
export function filterEventsForTimeWindow(
  events: IcsExportableEvent[],
  options: {
    startDate?: string;
    endDate?: string;
    memberId?: string;
    mode?: "expanded" | "rrule";
  } = {}
): IcsExportableEvent[] {
  const { startDate, endDate, memberId } = options;
  const mode = options.mode || (startDate && endDate ? "expanded" : "rrule");

  // 1. Filter by participant if requested
  const memberFiltered = events.filter((evt) => {
    if (!memberId || memberId === "all") return true;
    const ids = normalizeEventMemberIds(evt);
    // Include whole-group events (no member assigned) or events matching memberId
    return ids.length === 0 || ids.includes(memberId);
  });

  // 2. If no date window is specified and mode is "rrule", return all matching events
  if (!startDate && !endDate && mode === "rrule") {
    return memberFiltered;
  }

  const rangeStartStr = startDate || "1970-01-01";
  const rangeEndStr = endDate || "2099-12-31";

  if (mode === "expanded") {
    const [sy, sm, sd] = rangeStartStr.split("-").map(Number);
    const [ey, em, ed] = rangeEndStr.split("-").map(Number);
    const rangeStart = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0);
    const rangeEnd = new Date(ey, (em || 12) - 1, ed || 31, 23, 59, 59);

    const prepared = memberFiltered.map((evt) => {
      const date = extractEventDateStr(evt.startTime);
      const time = evt.startTime.includes("T")
        ? evt.startTime.split("T")[1].slice(0, 5)
        : "09:00";
      return {
        ...evt,
        date,
        time,
        isAllDay: Boolean(evt.isAllDay),
      };
    });

    const expanded = expandRecurringEvents(prepared, rangeStart, rangeEnd);

    return expanded
      .filter((item) => item.date >= rangeStartStr && item.date <= rangeEndStr)
      .map((item) => {
        const durationMins = computeDurationMinutes(item.startTime, item.endTime, 60);
        const computed = computeEventTimes(
          item.date,
          item.time || "09:00",
          durationMins,
          Boolean(item.isAllDay)
        );
        return {
          ...item,
          startTime: item.startTime || computed.startTimeISO,
          endTime: item.endTime || computed.endTimeISO,
          // Expanded occurrences are concrete single events in the window
          rrule: null,
          exdates: null,
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // mode === "rrule": keep recurring series that overlap the window and non-recurring events inside the window
  return memberFiltered
    .filter((evt) => {
      const evtDate = extractEventDateStr(evt.startTime);
      const freq = rruleToFrequency(evt.rrule);
      if (freq === "none") {
        const excluded = new Set(parseExdates(evt.exdates));
        if (excluded.has(evtDate)) return false;
        return evtDate >= rangeStartStr && evtDate <= rangeEndStr;
      }
      // Recurring series starts on or before rangeEndStr
      return evtDate <= rangeEndStr;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Generates a complete, standards-compliant RFC 5545 iCalendar (.ics) document
 * ready to be imported into Google Calendar, Apple Calendar, Outlook, or Proton.
 */
export function generateIcsCalendar(
  events: IcsExportableEvent[],
  options: IcsExportOptions
): string {
  const {
    calendarName,
    description,
    timezone = "America/New_York",
    startDate,
    endDate,
    memberId,
    mode,
    participants = [],
    prodId = "-//JlightCalendar//Comets & Galaxies v1.0//EN",
  } = options;

  const participantMap = new Map(
    participants.map((p) => [p.id, p.displayName])
  );

  const windowEvents = filterEventsForTimeWindow(events, {
    startDate,
    endDate,
    memberId,
    mode,
  });

  const nowUtc = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    foldIcsLine(`PRODID:${prodId}`),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
    foldIcsLine(`X-WR-TIMEZONE:${escapeIcsText(timezone)}`),
  ];

  if (description) {
    lines.push(foldIcsLine(`X-WR-CALDESC:${escapeIcsText(description)}`));
  }

  for (const evt of windowEvents) {
    const isAllDay = Boolean(evt.isAllDay);
    const uid = `${evt.id.replace(/[^a-zA-Z0-9_-]/g, "")}@jlightcalendar.local`;

    lines.push("BEGIN:VEVENT");
    lines.push(foldIcsLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${nowUtc}`);

    if (isAllDay) {
      const dtStart = formatIcsDateTime(evt.startTime, true);
      const dtEnd = formatIcsAllDayEndExclusive(evt.endTime || evt.startTime);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    } else {
      const dtStart = formatIcsDateTime(evt.startTime, false);
      const dtEnd = formatIcsDateTime(evt.endTime || evt.startTime, false);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }

    lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(evt.title)}`));

    // Annotate participant names if assigned
    const memberIds = normalizeEventMemberIds(evt);
    const assignedNames = memberIds
      .map((id) => participantMap.get(id))
      .filter(Boolean) as string[];

    let fullDescription = evt.description || "";
    if (assignedNames.length > 0) {
      const suffix = `Participants: ${assignedNames.join(", ")}`;
      fullDescription = fullDescription
        ? `${fullDescription}\n\n${suffix}`
        : suffix;
      lines.push(
        foldIcsLine(
          `CATEGORIES:${assignedNames.map((n) => escapeIcsText(n)).join(",")}`
        )
      );
    }

    if (fullDescription) {
      lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(fullDescription)}`));
    }

    if (evt.location) {
      lines.push(foldIcsLine(`LOCATION:${escapeIcsText(evt.location)}`));
    }

    if (evt.url) {
      lines.push(foldIcsLine(`URL:${evt.url.trim()}`));
    }

    if (evt.status) {
      lines.push(`STATUS:${evt.status.toUpperCase().trim()}`);
    }

    if (typeof evt.priority === "number" && !isNaN(evt.priority)) {
      lines.push(`PRIORITY:${evt.priority}`);
    }

    if (evt.transparency) {
      lines.push(`TRANSP:${evt.transparency.toUpperCase().trim()}`);
    }

    if (evt.classification) {
      lines.push(`CLASS:${evt.classification.toUpperCase().trim()}`);
    }

    if (evt.geo) {
      lines.push(`GEO:${evt.geo.trim()}`);
    }

    if (evt.organizer) {
      let org = evt.organizer;
      if (typeof org === "string") {
        try {
          org = JSON.parse(org);
        } catch {
          org = { email: evt.organizer as string };
        }
      }
      if (typeof org === "object" && org !== null) {
        const cn = org.name ? `;CN=${escapeIcsText(org.name)}` : "";
        lines.push(
          foldIcsLine(
            `ORGANIZER${cn}:mailto:${org.email || "noreply@jlightcalendar.local"}`
          )
        );
      }
    }

    if (evt.attendees) {
      let atts = evt.attendees;
      if (typeof atts === "string") {
        try {
          atts = JSON.parse(atts);
        } catch {
          atts = [];
        }
      }
      if (Array.isArray(atts)) {
        for (const att of atts) {
          if (att && typeof att === "object") {
            const role = att.role ? `;ROLE=${att.role.toUpperCase()}` : "";
            const partstat = att.status
              ? `;PARTSTAT=${att.status.toUpperCase()}`
              : "";
            const cn = att.name ? `;CN=${escapeIcsText(att.name)}` : "";
            lines.push(
              foldIcsLine(
                `ATTENDEE${role}${partstat}${cn}:mailto:${
                  att.email || "guest@jlightcalendar.local"
                }`
              )
            );
          }
        }
      }
    }

    if (evt.alarms) {
      let alms = evt.alarms;
      if (typeof alms === "string") {
        try {
          alms = JSON.parse(alms);
        } catch {
          alms = [];
        }
      }
      if (Array.isArray(alms)) {
        for (const alm of alms) {
          if (alm && typeof alm === "object") {
            lines.push("BEGIN:VALARM");
            lines.push(`TRIGGER:${alm.trigger || "-PT15M"}`);
            lines.push(`ACTION:${(alm.action || "DISPLAY").toUpperCase()}`);
            if (alm.description || evt.title) {
              lines.push(
                foldIcsLine(
                  `DESCRIPTION:${escapeIcsText(alm.description || evt.title)}`
                )
              );
            }
            lines.push("END:VALARM");
          }
        }
      }
    }

    // Preserve RRULE + EXDATE when exported in rrule mode
    if (evt.rrule && rruleToFrequency(evt.rrule) !== "none") {
      let rruleClean = evt.rrule.replace(/^RRULE:/i, "").trim();
      if (endDate && !rruleClean.toUpperCase().includes("UNTIL=")) {
        const untilFormatted = `${endDate.replace(/-/g, "")}T235959Z`;
        rruleClean = `${rruleClean};UNTIL=${untilFormatted}`;
      }
      lines.push(foldIcsLine(`RRULE:${rruleClean}`));

      const exdates = parseExdates(evt.exdates);
      for (const exDate of exdates) {
        const cleanDate = exDate.replace(/-/g, "");
        if (isAllDay) {
          lines.push(`EXDATE;VALUE=DATE:${cleanDate}`);
        } else {
          const startFormatted = formatIcsDateTime(evt.startTime, false);
          const timeSuffix = startFormatted.includes("T")
            ? startFormatted.split("T")[1]
            : "090000";
          lines.push(`EXDATE:${cleanDate}T${timeSuffix}`);
        }
      }
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generates a 1-click "Add to Google Calendar" template URL for a single event.
 */
export function buildGoogleCalendarTemplateUrl(evt: IcsExportableEvent): string {
  const isAllDay = Boolean(evt.isAllDay);
  const start = formatIcsDateTime(evt.startTime, isAllDay);
  const end = isAllDay
    ? formatIcsAllDayEndExclusive(evt.endTime || evt.startTime)
    : formatIcsDateTime(evt.endTime || evt.startTime, false);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evt.title || "Jlight Event",
    dates: `${start}/${end}`,
  });

  if (evt.description) {
    params.set("details", evt.description);
  }
  if (evt.location) {
    params.set("location", evt.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Parses an RFC 5545 date/datetime value into ISO string (YYYY-MM-DDTHH:mm:ss) and isAllDay flag.
 */
export function parseIcsDate(
  valueStr: string,
  params: Record<string, string> = {}
): {
  isoString: string;
  dateStr: string;
  isAllDay: boolean;
} {
  const cleanVal = (valueStr || "").trim();
  const isDateParam = params["VALUE"]?.toUpperCase() === "DATE";

  // Check if it's an 8-digit date: YYYYMMDD
  if (isDateParam || /^\d{8}$/.test(cleanVal)) {
    const y = cleanVal.slice(0, 4);
    const m = cleanVal.slice(4, 6);
    const d = cleanVal.slice(6, 8);
    const dateStr = `${y}-${m}-${d}`;
    return {
      isoString: `${dateStr}T00:00:00`,
      dateStr,
      isAllDay: true,
    };
  }

  // Check if it's datetime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const dtMatch = cleanVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i);
  if (dtMatch) {
    const [, y, m, d, hh, mm, ss = "00"] = dtMatch;
    const dateStr = `${y}-${m}-${d}`;
    return {
      isoString: `${dateStr}T${hh}:${mm}:${ss}`,
      dateStr,
      isAllDay: false,
    };
  }

  // Fallback: If it's already an ISO string or other standard format
  const parsed = new Date(cleanVal);
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().slice(0, 19);
    const dateStr = iso.slice(0, 10);
    return {
      isoString: iso,
      dateStr,
      isAllDay: false,
    };
  }

  // Fallback to today
  const now = new Date();
  const dateStr = formatLocalDate(now);
  return {
    isoString: `${dateStr}T09:00:00`,
    dateStr,
    isAllDay: false,
  };
}

/**
 * Parses an RFC 5545 duration string (e.g. PT1H30M, P1D, PT45M) into minutes.
 */
export function parseIcsDurationMinutes(durationStr: string): number {
  if (!durationStr) return 60;
  const match = durationStr
    .trim()
    .match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return 60;
  const isNegative = match[1] === "-";
  const weeks = parseInt(match[2] || "0", 10);
  const days = parseInt(match[3] || "0", 10);
  const hours = parseInt(match[4] || "0", 10);
  const mins = parseInt(match[5] || "0", 10);
  const total = weeks * 7 * 24 * 60 + days * 24 * 60 + hours * 60 + mins;
  return isNegative ? -total : total;
}

/**
 * Adds minutes to an ISO datetime string without timezone drift.
 */
export function addMinutesToIso(isoStr: string, minutes: number): string {
  const [datePart, timePart = "00:00:00"] = isoStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss] = timePart.split(":").map(Number);
  const dateObj = new Date(y, m - 1, d, hh, mm + minutes, ss || 0);
  const newDate = formatLocalDate(dateObj);
  const newHh = String(dateObj.getHours()).padStart(2, "0");
  const newMm = String(dateObj.getMinutes()).padStart(2, "0");
  const newSs = String(dateObj.getSeconds()).padStart(2, "0");
  return `${newDate}T${newHh}:${newMm}:${newSs}`;
}

/**
 * Parses a complete RFC 5545 iCalendar (.ics) string into structured calendar metadata and events.
 */
export function parseIcsCalendar(icsContent: string): ParsedIcsCalendar {
  if (!icsContent || typeof icsContent !== "string") {
    return { events: [] };
  }

  // 1. Unfold lines per RFC 5545 Section 3.1
  const unfolded = icsContent
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "");

  const rawLines = unfolded.split(/\r?\n/);

  let calendarName: string | undefined;
  let description: string | undefined;
  let timezone: string | undefined;
  let prodId: string | undefined;

  const events: ParsedIcsEvent[] = [];

  interface RawEventCollector {
    uid?: string;
    summary?: string;
    description?: string;
    location?: string;
    dtStartRaw?: string;
    dtStartParams: Record<string, string>;
    dtEndRaw?: string;
    dtEndParams: Record<string, string>;
    durationRaw?: string;
    rruleRaw?: string;
    exdates: string[];
    categories: string[];
    url?: string;
    status?: string;
    priority?: number;
    transparency?: string;
    classification?: string;
    geo?: string;
    organizer?: ParsedIcsOrganizer;
    attendees: ParsedIcsAttendee[];
    alarms: ParsedIcsAlarm[];
  }

  let inVCalendar = false;
  let inVEvent = false;
  let inVAlarm = false;
  let currentAlarm: Partial<ParsedIcsAlarm> | null = null;
  let currentEvent: RawEventCollector | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "BEGIN:VCALENDAR") {
      inVCalendar = true;
      continue;
    }
    if (line === "END:VCALENDAR") {
      inVCalendar = false;
      continue;
    }

    if (line === "BEGIN:VALARM") {
      inVAlarm = true;
      currentAlarm = {};
      continue;
    }
    if (line === "END:VALARM") {
      inVAlarm = false;
      if (currentEvent && currentAlarm) {
        currentEvent.alarms.push({
          trigger: currentAlarm.trigger,
          action: currentAlarm.action || "DISPLAY",
          description: currentAlarm.description,
        });
      }
      currentAlarm = null;
      continue;
    }

    if (line === "BEGIN:VEVENT") {
      inVEvent = true;
      currentEvent = {
        dtStartParams: {},
        dtEndParams: {},
        exdates: [],
        categories: [],
        attendees: [],
        alarms: [],
      };
      continue;
    }

    if (line === "END:VEVENT") {
      inVEvent = false;
      if (currentEvent && currentEvent.dtStartRaw) {
        const startParsed = parseIcsDate(
          currentEvent.dtStartRaw,
          currentEvent.dtStartParams
        );
        const isAllDay = startParsed.isAllDay;
        const startTime = startParsed.isoString;
        let endTime = startTime;

        if (isAllDay) {
          if (currentEvent.dtEndRaw) {
            const endParsed = parseIcsDate(
              currentEvent.dtEndRaw,
              currentEvent.dtEndParams
            );
            if (endParsed.dateStr > startParsed.dateStr) {
              // RFC 5545 all-day DTEND is exclusive (next day).
              // Adjust back 1 day to make inclusive end date in JlightCalendar
              const [ey, em, ed] = endParsed.dateStr.split("-").map(Number);
              const endDate = new Date(ey, em - 1, ed);
              endDate.setDate(endDate.getDate() - 1);
              const prevDateStr = formatLocalDate(endDate);
              endTime = `${prevDateStr < startParsed.dateStr ? startParsed.dateStr : prevDateStr}T23:59:59`;
            } else {
              endTime = `${startParsed.dateStr}T23:59:59`;
            }
          } else {
            endTime = `${startParsed.dateStr}T23:59:59`;
          }
        } else {
          // Timed event
          if (currentEvent.dtEndRaw) {
            const endParsed = parseIcsDate(
              currentEvent.dtEndRaw,
              currentEvent.dtEndParams
            );
            endTime = endParsed.isoString;
          } else if (currentEvent.durationRaw) {
            const durationMins = parseIcsDurationMinutes(currentEvent.durationRaw);
            endTime = addMinutesToIso(startTime, durationMins);
          } else {
            // Default timed event to 60 minutes
            endTime = addMinutesToIso(startTime, 60);
          }
        }

        const externalUid =
          currentEvent.uid ||
          `imported_${Date.now()}_${Math.random().toString(36).slice(2, 9)}@jlightcalendar.local`;

        const title = unescapeIcsText(currentEvent.summary) || "Untitled Event";
        const desc = unescapeIcsText(currentEvent.description) || null;
        const loc = unescapeIcsText(currentEvent.location) || null;

        events.push({
          externalUid,
          title,
          description: desc,
          location: loc,
          startTime,
          endTime,
          isAllDay,
          rrule: currentEvent.rruleRaw ? currentEvent.rruleRaw.replace(/^RRULE:/i, "").trim() : null,
          exdates: currentEvent.exdates.length > 0 ? currentEvent.exdates : undefined,
          categories: currentEvent.categories.length > 0 ? currentEvent.categories : undefined,
          url: currentEvent.url || null,
          status: currentEvent.status || null,
          priority: currentEvent.priority || null,
          transparency: currentEvent.transparency || null,
          classification: currentEvent.classification || null,
          geo: currentEvent.geo || null,
          organizer: currentEvent.organizer || null,
          attendees: currentEvent.attendees.length > 0 ? currentEvent.attendees : undefined,
          alarms: currentEvent.alarms.length > 0 ? currentEvent.alarms : undefined,
        });
      }
      currentEvent = null;
      continue;
    }

    // Property parsing
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const propHeader = line.slice(0, colonIdx);
    const propValue = line.slice(colonIdx + 1);

    const semiIdx = propHeader.indexOf(";");
    const propName = (semiIdx === -1 ? propHeader : propHeader.slice(0, semiIdx))
      .toUpperCase()
      .trim();

    const params: Record<string, string> = {};
    if (semiIdx !== -1) {
      const paramStr = propHeader.slice(semiIdx + 1);
      const tokens = paramStr.split(";");
      for (const tok of tokens) {
        const eqIdx = tok.indexOf("=");
        if (eqIdx !== -1) {
          const k = tok.slice(0, eqIdx).trim().toUpperCase();
          const v = tok.slice(eqIdx + 1).replace(/^"(.*)"$/, "$1").trim();
          params[k] = v;
        }
      }
    }

    if (inVAlarm && currentAlarm) {
      if (propName === "TRIGGER") {
        currentAlarm.trigger = propValue.trim();
      } else if (propName === "ACTION") {
        currentAlarm.action = propValue.trim();
      } else if (propName === "DESCRIPTION") {
        currentAlarm.description = unescapeIcsText(propValue);
      }
      continue;
    }

    if (inVEvent && currentEvent) {
      switch (propName) {
        case "UID":
          currentEvent.uid = propValue.trim();
          break;
        case "SUMMARY":
          currentEvent.summary = propValue;
          break;
        case "DESCRIPTION":
          currentEvent.description = propValue;
          break;
        case "LOCATION":
          currentEvent.location = propValue;
          break;
        case "URL":
          currentEvent.url = propValue.trim();
          break;
        case "STATUS":
          currentEvent.status = propValue.trim().toUpperCase();
          break;
        case "PRIORITY": {
          const pri = parseInt(propValue.trim(), 10);
          if (!isNaN(pri)) currentEvent.priority = pri;
          break;
        }
        case "TRANSP":
          currentEvent.transparency = propValue.trim().toUpperCase();
          break;
        case "CLASS":
          currentEvent.classification = propValue.trim().toUpperCase();
          break;
        case "GEO":
          currentEvent.geo = propValue.trim();
          break;
        case "ORGANIZER": {
          const orgEmail = propValue.replace(/^mailto:/i, "").trim();
          const orgName = params["CN"] ? unescapeIcsText(params["CN"]) : undefined;
          currentEvent.organizer = { name: orgName, email: orgEmail };
          break;
        }
        case "ATTENDEE": {
          const attEmail = propValue.replace(/^mailto:/i, "").trim();
          const attName = params["CN"] ? unescapeIcsText(params["CN"]) : undefined;
          const attRole = params["ROLE"] ? params["ROLE"].toUpperCase() : undefined;
          const attStatus = params["PARTSTAT"] ? params["PARTSTAT"].toUpperCase() : undefined;
          currentEvent.attendees.push({
            name: attName,
            email: attEmail,
            role: attRole,
            status: attStatus,
          });
          break;
        }
        case "DTSTART":
          currentEvent.dtStartRaw = propValue.trim();
          currentEvent.dtStartParams = params;
          break;
        case "DTEND":
          currentEvent.dtEndRaw = propValue.trim();
          currentEvent.dtEndParams = params;
          break;
        case "DURATION":
          currentEvent.durationRaw = propValue.trim();
          break;
        case "RRULE":
          currentEvent.rruleRaw = propValue.trim();
          break;
        case "EXDATE": {
          const dates = propValue.split(",");
          for (const d of dates) {
            const cleanD = d.trim();
            if (cleanD.length >= 8) {
              const y = cleanD.slice(0, 4);
              const m = cleanD.slice(4, 6);
              const day = cleanD.slice(6, 8);
              currentEvent.exdates.push(`${y}-${m}-${day}`);
            }
          }
          break;
        }
        case "CATEGORIES": {
          const cats = propValue
            .split(",")
            .map((c) => unescapeIcsText(c.trim()))
            .filter(Boolean);
          currentEvent.categories.push(...cats);
          break;
        }
      }
    } else if (inVCalendar) {
      switch (propName) {
        case "X-WR-CALNAME":
          calendarName = unescapeIcsText(propValue);
          break;
        case "X-WR-CALDESC":
          description = unescapeIcsText(propValue);
          break;
        case "X-WR-TIMEZONE":
          timezone = propValue.trim();
          break;
        case "PRODID":
          prodId = propValue.trim();
          break;
      }
    }
  }

  return {
    calendarName,
    description,
    timezone,
    prodId,
    events,
  };
}
