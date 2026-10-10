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
 */
export function computeEventTimes(
  date: string, // YYYY-MM-DD
  time: string, // HH:mm
  durationMinutes: number,
  isAllDay: boolean
): { startTimeISO: string; endTimeISO: string } {
  if (isAllDay) {
    return {
      startTimeISO: `${date}T00:00:00`,
      endTimeISO: `${date}T23:59:59`,
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
            const computed = computeEventTimes(
              occurrenceDateStr,
              timeOnly,
              durationMins,
              Boolean(event.isAllDay)
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
