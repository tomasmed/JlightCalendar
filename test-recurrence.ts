import {
  rruleToFrequency,
  frequencyToRrule,
  computeEventTimes,
  computeDurationMinutes,
  expandRecurringEvents,
  BaseCalendarEventItem,
} from "./src/lib/recurrence";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ Passed: ${msg}`);
}

console.log("--- Testing RRULE Conversion ---");
assert(rruleToFrequency("FREQ=DAILY") === "daily", "daily rrule");
assert(rruleToFrequency("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR") === "weekday", "weekday rrule");
assert(rruleToFrequency("FREQ=WEEKLY") === "weekly", "weekly rrule");
assert(rruleToFrequency("FREQ=MONTHLY") === "monthly", "monthly rrule");
assert(rruleToFrequency(null) === "none", "null rrule");
assert(frequencyToRrule("daily") === "FREQ=DAILY", "freq to rrule");

console.log("\n--- Testing Event Times & Duration (No Timezone Drift) ---");
const { startTimeISO, endTimeISO } = computeEventTimes("2026-10-01", "09:00", 60, false);
assert(startTimeISO === "2026-10-01T09:00:00", "startTimeISO matches local 9:00 AM");
assert(endTimeISO === "2026-10-01T10:00:00", "endTimeISO matches local 10:00 AM");
assert(computeDurationMinutes(startTimeISO, endTimeISO) === 60, "duration is exactly 60 mins");

const fifteenMins = computeEventTimes("2026-10-01", "09:00", 15, false);
assert(fifteenMins.startTimeISO === "2026-10-01T09:00:00", "15m startTime");
assert(fifteenMins.endTimeISO === "2026-10-01T09:15:00", "15m endTime");
assert(computeDurationMinutes(fifteenMins.startTimeISO, fifteenMins.endTimeISO) === 15, "15m duration is exactly 15 mins");

console.log("\n--- Testing Recurring Expansion ---");
const baseEvent: BaseCalendarEventItem = {
  id: "evt-daily-walk",
  date: "2026-10-01",
  time: "08:00 AM",
  startTime: "2026-10-01T08:00:00",
  endTime: "2026-10-01T08:30:00",
  rrule: "FREQ=DAILY",
  title: "Morning Dog Walk",
};

const rangeStart = new Date(2026, 9, 1); // Oct 1, 2026
const rangeEnd = new Date(2026, 9, 7);   // Oct 7, 2026
const expandedDaily = expandRecurringEvents([baseEvent], rangeStart, rangeEnd);
assert(expandedDaily.length === 7, `Expected 7 daily occurrences, got ${expandedDaily.length}`);
assert(expandedDaily[0].id === "evt-daily-walk", "First occurrence is original id");
assert(expandedDaily[1].id === "evt-daily-walk_2026-10-02", "Second occurrence has generated id");
assert(expandedDaily[1].baseEventId === "evt-daily-walk", "Occurrence keeps baseEventId");
assert(expandedDaily[1].startTime === "2026-10-02T08:00:00", "Occurrence keeps correct start time");
assert(expandedDaily[1].endTime === "2026-10-02T08:30:00", "Occurrence keeps correct end time (30 mins)");

// Weekday recurrence
const weekdayEvent: BaseCalendarEventItem = {
  id: "evt-standup",
  date: "2026-10-01", // Thursday
  time: "10:00 AM",
  startTime: "2026-10-01T10:00:00",
  endTime: "2026-10-01T10:30:00",
  rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  title: "Team Standup",
};
// Oct 1 (Thu), Oct 2 (Fri), Oct 3 (Sat - skip), Oct 4 (Sun - skip), Oct 5 (Mon), Oct 6 (Tue), Oct 7 (Wed) -> 5 occurrences!
const expandedWeekday = expandRecurringEvents([weekdayEvent], rangeStart, rangeEnd);
assert(expandedWeekday.length === 5, `Expected 5 weekday occurrences, got ${expandedWeekday.length}`);

// Weekly recurrence (only Thursdays: Oct 1, Oct 8, Oct 15)
const weeklyEvent: BaseCalendarEventItem = {
  id: "evt-trash-day",
  date: "2026-10-01", // Thursday
  time: "07:00 AM",
  startTime: "2026-10-01T07:00:00",
  endTime: "2026-10-01T07:15:00",
  rrule: "FREQ=WEEKLY",
  title: "Take Out Recycling",
};
const monthEnd = new Date(2026, 9, 31);
const expandedWeekly = expandRecurringEvents([weeklyEvent], rangeStart, monthEnd);
// Oct 1, 8, 15, 22, 29 = 5 Thursdays
assert(expandedWeekly.length === 5, `Expected 5 weekly occurrences, got ${expandedWeekly.length}`);

console.log("\nAll recurrence and duration unit tests passed successfully!");
