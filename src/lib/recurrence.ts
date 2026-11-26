export type RecurrenceFrequency = "none" | "daily" | "weekday" | "weekly" | "biweekly" | "monthly";

export interface RecurrenceOption {
  value: RecurrenceFrequency;
  label: string;
  rrule: string | null;
}

export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: "none", label: "Does not repeat", rrule: null },
  { value: "daily", label: "Daily", rrule: "FREQ=DAILY" },
  { value: "weekday", label: "Every weekday (Mon - Fri)", rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { value: "weekly", label: "Weekly", rrule: "FREQ=WEEKLY" },
  { value: "biweekly", label: "Every 2 weeks (Biweekly)", rrule: "FREQ=WEEKLY;INTERVAL=2" },
  { value: "monthly", label: "Monthly", rrule: "FREQ=MONTHLY" },
];

/**
 * Parses an RRULE string into one of the supported frequency categories.
 */
export function rruleToFrequency(rrule?: string | null): RecurrenceFrequency {
  if (!rrule) return "none";
  const rule = rrule.toUpperCase().trim();
  if (rule === "NONE" || rule === "") return "none";
  if (rule.includes("BYDAY=MO,TU,WE,TH,FR") || rule.includes("WEEKDAY")) {
    return "weekday";
  }
  if (rule.includes("INTERVAL=2") || rule.includes("BIWEEKLY")) {
    return "biweekly";
  }
  if (rule.includes("FREQ=DAILY") || rule === "DAILY") {
    return "daily";
  }
  if (rule.includes("FREQ=WEEKLY") || rule === "WEEKLY") {
    return "weekly";
  }
  if (rule.includes("FREQ=MONTHLY") || rule === "MONTHLY") {
    return "monthly";
  }
  return "none";
}

/**
 * Converts a RecurrenceFrequency to its standard RFC 5545 RRULE representation.
 */
export function frequencyToRrule(freq: RecurrenceFrequency): string | null {
  const match = RECURRENCE_OPTIONS.find((opt) => opt.value === freq);
  return match ? match.rrule : null;
}

/**
 * Returns a human-friendly label for a given RRULE or frequency.
 */
export function getRecurrenceLabel(rrule?: string | null): string {
  const freq = rruleToFrequency(rrule);
  switch (freq) {
    case "daily":
      return "Repeats daily";
    case "weekday":
      return "Repeats every weekday (Mon-Fri)";
    case "weekly":
      return "Repeats weekly";
    case "biweekly":
      return "Repeats every 2 weeks";
    case "monthly":
      return "Repeats monthly";
    default:
      return "Does not repeat";
  }
}

/**
 * Parses an exdates string or JSON array into an array of YYYY-MM-DD date strings.
 */
export function parseExdates(raw?: string[] | string | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        // Fall back to comma-separated
      }
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Format a Date object into a local ISO string (YYYY-MM-DDTHH:mm:ss)
 * without any UTC timezone conversion drift.
 */
export function formatLocalISO(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

/**
 * Format a Date object into YYYY-MM-DD local date string.
 */
export function formatLocalDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates start and end ISO strings purely in local wall-clock time
 * to prevent any timezone offset duration errors.
 * For multi-day all-day events, pass an optional inclusive `endDate` (YYYY-MM-DD).
 */
export function computeEventTimes(
  date: string, // YYYY-MM-DD
  time: string, // HH:mm
  durationMinutes: number,
  isAllDay: boolean,
  endDate?: string | null // Optional inclusive YYYY-MM-DD for multi-day all-day events
): { startTimeISO: string; endTimeISO: string } {
  if (isAllDay) {
    const effectiveEndDate =
      endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate >= date
        ? endDate
        : date;
    return {
      startTimeISO: `${date}T00:00:00`,
      endTimeISO: `${effectiveEndDate}T23:59:59`,
    };
  }

  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));

  const startDt = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  const endDt = new Date(startDt.getTime() + Math.max(1, durationMinutes) * 60000);

  return {
    startTimeISO: formatLocalISO(startDt),
    endTimeISO: formatLocalISO(endDt),
  };
}

/**
 * Extracts the inclusive local start date (YYYY-MM-DD) from an event.
 */
export function getEventStartDate(event: {
  date?: string;
  startTime?: string;
}): string {
  if (event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return event.date;
  }
  if (event.startTime) {
    return event.startTime.split("T")[0];
  }
  return "";
}

/**
 * Extracts the inclusive local end date (YYYY-MM-DD) from an event.
 * In v1, multi-day spans apply to all-day events (`isAllDay: true`).
 */
export function getEventEndDate(event: {
  date?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
}): string {
  const startDate = getEventStartDate(event);
  if (!startDate) return "";
  if (!event.isAllDay || !event.endTime) {
    return startDate;
  }
  const endDate = event.endTime.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate >= startDate) {
    return endDate;
  }
  return startDate;
}

/**
 * Computes the inclusive number of calendar days between two YYYY-MM-DD dates.
 * Returns at least 1.
 */
export function getEventSpanDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate <= startDate) return 1;
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  if (isNaN(sy) || isNaN(sm) || isNaN(sd) || isNaN(ey) || isNaN(em) || isNaN(ed)) {
    return 1;
  }
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Adds a number of calendar days to a YYYY-MM-DD local date string.
 */
export function addDaysToLocalDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dt = new Date(y, m - 1, d + days);
  return formatLocalDate(dt);
}

/**
 * Returns true if the event is an all-day event spanning 2 or more days.
 */
export function isMultiDayAllDayEvent(event: {
  date?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
}): boolean {
  if (!event.isAllDay) return false;
  const startDate = getEventStartDate(event);
  const endDate = getEventEndDate(event);
  return Boolean(startDate && endDate && endDate > startDate);
}

/**
 * Returns true if the event covers the given local YYYY-MM-DD date.
 */
export function eventCoversDate(
  event: {
    date?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
  },
  dateStr: string
): boolean {
  const startDate = getEventStartDate(event);
  if (!startDate || !dateStr) return false;
  const endDate = getEventEndDate(event);
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * For multi-day all-day events covering `dateStr`, returns a human-friendly progress label
 * like "Day 2 of 5". Returns null for single-day or timed events.
 */
export function getMultiDayProgressLabel(
  event: {
    date?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
  },
  dateStr: string
): string | null {
  if (!isMultiDayAllDayEvent(event) || !eventCoversDate(event, dateStr)) {
    return null;
  }
  const startDate = getEventStartDate(event);
  const endDate = getEventEndDate(event);
  const totalDays = getEventSpanDays(startDate, endDate);
  const currentDay = getEventSpanDays(startDate, dateStr);
  return `Day ${currentDay} of ${totalDays}`;
}

export interface SpanningWeekSegment<T> {
  event: T;
  startCol: number; // 0..6
  span: number; // 1..7
  lane: number; // 0-indexed vertical lane
  continuesFromPrev: boolean;
  continuesToNext: boolean;
  isMultiDay: boolean;
  totalDays: number;
}

export interface SpanningWeekLayout<T> {
  visibleSegments: SpanningWeekSegment<T>[];
  allSegments: SpanningWeekSegment<T>[];
  overflowByCol: number[]; // Length 7: count of hidden segments covering each day column
  visibleLaneCount: number;
  totalLaneCount: number;
}

/**
 * Computes continuous horizontal spanning bars for all-day / multi-day events
 * across a 7-day week row (`weekDateStrs`), using greedy lane packing.
 * When `maxVisibleLanes` is provided (e.g. 2 in Month View), excess lanes are
 * counted in `overflowByCol` for "+N more" badges.
 */
export function layoutSpanningWeekEvents<
  T extends {
    id: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
    title?: string;
  }
>(
  events: T[],
  weekDateStrs: string[],
  maxVisibleLanes?: number
): SpanningWeekLayout<T> {
  const colCount = weekDateStrs.length;
  const overflowByCol = Array.from({ length: colCount }, () => 0);

  if (colCount === 0 || events.length === 0) {
    return {
      visibleSegments: [],
      allSegments: [],
      overflowByCol,
      visibleLaneCount: 0,
      totalLaneCount: 0,
    };
  }

  const weekStart = weekDateStrs[0];
  const weekEnd = weekDateStrs[colCount - 1];

  // Collect events that overlap this week
  const rawSegments: Omit<SpanningWeekSegment<T>, "lane">[] = [];

  for (const evt of events) {
    const startDate = getEventStartDate(evt);
    const endDate = getEventEndDate(evt);
    if (!startDate || !endDate) continue;
    if (endDate < weekStart || startDate > weekEnd) continue;

    const clippedStart = startDate < weekStart ? weekStart : startDate;
    const clippedEnd = endDate > weekEnd ? weekEnd : endDate;

    const startCol = weekDateStrs.indexOf(clippedStart);
    const endCol = weekDateStrs.indexOf(clippedEnd);
    if (startCol === -1 || endCol === -1 || endCol < startCol) continue;

    const totalDays = getEventSpanDays(startDate, endDate);
    rawSegments.push({
      event: evt,
      startCol,
      span: endCol - startCol + 1,
      continuesFromPrev: startDate < weekStart,
      continuesToNext: endDate > weekEnd,
      isMultiDay: totalDays > 1,
      totalDays,
    });
  }

  // Sort: earlier startCol first, then longer spans first (classic calendar packing), then title
  rawSegments.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    if (b.span !== a.span) return b.span - a.span;
    if (a.isMultiDay !== b.isMultiDay) return a.isMultiDay ? -1 : 1;
    return (a.event.title || "").localeCompare(b.event.title || "");
  });

  // Greedy lane assignment: track occupied endCol per lane
  const laneEndCols: number[] = [];
  const allSegments: SpanningWeekSegment<T>[] = [];

  for (const seg of rawSegments) {
    const segEndCol = seg.startCol + seg.span - 1;
    let assignedLane = -1;

    for (let lane = 0; lane < laneEndCols.length; lane++) {
      if (laneEndCols[lane] < seg.startCol) {
        assignedLane = lane;
        laneEndCols[lane] = segEndCol;
        break;
      }
    }

    if (assignedLane === -1) {
      assignedLane = laneEndCols.length;
      laneEndCols.push(segEndCol);
    }

    allSegments.push({
      ...seg,
      lane: assignedLane,
    });
  }

  const totalLaneCount = laneEndCols.length;
  const visibleSegments: SpanningWeekSegment<T>[] = [];

  for (const seg of allSegments) {
    if (maxVisibleLanes !== undefined && seg.lane >= maxVisibleLanes) {
      for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
        overflowByCol[c] += 1;
      }
    } else {
      visibleSegments.push(seg);
    }
  }

  const visibleLaneCount =
    maxVisibleLanes !== undefined
      ? Math.min(totalLaneCount, maxVisibleLanes)
      : totalLaneCount;

  return {
    visibleSegments,
    allSegments,
    overflowByCol,
    visibleLaneCount,
    totalLaneCount,
  };
}

/**
 * Extracts the duration in minutes from startTime and endTime.
 * Guarantees zero timezone offset bug when both are ISO strings.
 */
export function computeDurationMinutes(
  startTime?: string | null,
  endTime?: string | null,
  fallbackMinutes: number = 60
): number {
  if (!startTime || !endTime) return fallbackMinutes;

  if (startTime.includes("T") && endTime.includes("T")) {
    const [sDate, sTimePart] = startTime.split("T");
    const [eDate, eTimePart] = endTime.split("T");

    if (sDate === eDate) {
      const [sh, sm] = sTimePart.split(":").map(Number);
      const [eh, em] = eTimePart.split(":").map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) return diff;
      }
    }
  }

  const s = new Date(startTime).getTime();
  const e = new Date(endTime).getTime();
  const diff = Math.round((e - s) / 60000);
  return diff > 0 ? diff : fallbackMinutes;
}

export interface BaseCalendarEventItem {
  id: string;
  baseEventId?: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  rrule?: string | null;
  exdates?: string[] | string | null;
  duration?: string;
  title?: string;
  location?: string | null;
  description?: string | null;
  color?: string;
  memberId?: string | null;
  [key: string]: any;
}

/**
 * Expands recurring calendar events across a given date range.
 * Non-recurring events are preserved as-is.
 * Events with matching exdates (deleted single occurrences) are skipped.
 */
export function expandRecurringEvents<T extends BaseCalendarEventItem>(
  events: T[],
  rangeStart: Date,
  rangeEnd: Date
): (T & { baseEventId?: string })[] {
  const result: (T & { baseEventId?: string })[] = [];
  const startMs = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
  const endMs = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59).getTime();

  for (const event of events) {
    const freq = rruleToFrequency(event.rrule);
    const excludedDates = new Set(parseExdates(event.exdates));

    if (freq === "none") {
      if (!excludedDates.has(event.date)) {
        result.push(event);
      }
      continue;
    }

    const [by, bm, bd] = event.date.split("-").map(Number);
    const baseDate = new Date(by, bm - 1, bd);
    if (isNaN(baseDate.getTime())) {
      result.push(event);
      continue;
    }

    const durationMins = computeDurationMinutes(event.startTime, event.endTime, 60);
    const spanDays = event.isAllDay
      ? getEventSpanDays(event.date, getEventEndDate(event))
      : 1;
    const timeOnly = event.startTime?.includes("T")
      ? event.startTime.split("T")[1]?.slice(0, 5) || "09:00"
      : event.time && event.time.includes(":")
      ? event.time.slice(0, 5)
      : "09:00";

    // Begin from either the event's start date or rangeStart (whichever is later)
    const iterationStart = new Date(Math.max(baseDate.getTime(), startMs));
    iterationStart.setHours(0, 0, 0, 0);

    const iterationEnd = new Date(endMs);
    iterationEnd.setHours(23, 59, 59, 999);

    const current = new Date(iterationStart);

    while (current.getTime() <= iterationEnd.getTime()) {
      let matches = false;

      switch (freq) {
        case "daily":
          matches = true;
          break;
        case "weekday": {
          const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
          matches = dayOfWeek >= 1 && dayOfWeek <= 5;
          break;
        }
        case "weekly": {
          matches = current.getDay() === baseDate.getDay();
          break;
        }
        case "biweekly": {
          if (current.getDay() === baseDate.getDay()) {
            // Difference in weeks from baseDate must be even (0, 2, 4...)
            const msDiff = current.getTime() - baseDate.getTime();
            const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
            const weeksDiff = Math.round(daysDiff / 7);
            matches = weeksDiff >= 0 && weeksDiff % 2 === 0;
          }
          break;
        }
        case "monthly": {
          matches = current.getDate() === baseDate.getDate();
          break;
        }
      }

      if (matches) {
        const occurrenceDateStr = formatLocalDate(current);

        // Check if this occurrence was deleted as an individual exception
        if (!excludedDates.has(occurrenceDateStr)) {
          if (occurrenceDateStr === event.date) {
            result.push({
              ...event,
              baseEventId: event.id,
            });
          } else {
            const occurrenceEndDate =
              event.isAllDay && spanDays > 1
                ? addDaysToLocalDate(occurrenceDateStr, spanDays - 1)
                : undefined;
            const computed = computeEventTimes(
              occurrenceDateStr,
              timeOnly,
              durationMins,
              Boolean(event.isAllDay),
              occurrenceEndDate
            );

            result.push({
              ...event,
              id: `${event.id}_${occurrenceDateStr}`,
              baseEventId: event.id,
              date: occurrenceDateStr,
              startTime: computed.startTimeISO,
              endTime: computed.endTimeISO,
            });
          }
        }
      }

      // Increment current by 1 day
      current.setDate(current.getDate() + 1);
    }
  }

  return result;
}
