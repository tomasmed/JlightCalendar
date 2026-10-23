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
