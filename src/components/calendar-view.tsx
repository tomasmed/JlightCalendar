"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  X,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  Columns,
  List,
} from "lucide-react";
import { AccessMode } from "./kiosk-header";

export interface Member {
  id: string;
  name: string;
  color: string;
}

export const SAMPLE_MEMBERS: Member[] = [
  { id: "all", name: "All Family", color: "#ffd166" },
  { id: "m_mom", name: "Mom", color: "#ec4899" },
  { id: "m_dad", name: "Dad", color: "#10b981" },
  { id: "m_leo", name: "Leo", color: "#8b5cf6" },
  { id: "m_mia", name: "Mia", color: "#f59e0b" },
];

export interface CalendarEvent {
  id: string;
  memberId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  duration: string;
  location?: string;
  color: string;
}

export const INITIAL_MONTH_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    memberId: "m_leo",
    title: "Leo Soccer Practice",
    date: "2026-09-21",
    time: "4:30 PM",
    duration: "1 hr",
    location: "Community Field 2",
    color: "#8b5cf6",
  },
  {
    id: "e2",
    memberId: "m_mom",
    title: "Parent-Teacher Conference",
    date: "2026-09-21",
    time: "2:00 PM",
    duration: "30 min",
    location: "Lincoln Elementary",
    color: "#ec4899",
  },
  {
    id: "e3",
    memberId: "all",
    title: "Family Taco Night",
    date: "2026-09-21",
    time: "6:30 PM",
    duration: "1 hr",
    location: "Home",
    color: "#ffd166",
  },
  {
    id: "e4",
    memberId: "m_mia",
    title: "Mia Gymnastics",
    date: "2026-09-22",
    time: "5:15 PM",
    duration: "45 min",
    location: "YMCA Gym A",
    color: "#f59e0b",
  },
  {
    id: "e5",
    memberId: "m_dad",
    title: "Dentist Cleaning",
    date: "2026-09-23",
    time: "10:00 AM",
    duration: "1 hr",
    location: "Downtown Dental",
    color: "#10b981",
  },
  {
    id: "e6",
    memberId: "m_leo",
    title: "Soccer Match vs Hawks",
    date: "2026-09-26",
    time: "10:00 AM",
    duration: "1.5 hr",
    location: "West Field 4",
    color: "#8b5cf6",
  },
  {
    id: "e7",
    memberId: "all",
    title: "Grandparents Sunday Dinner",
    date: "2026-09-27",
    time: "4:00 PM",
    duration: "3 hr",
    location: "Grandma & Grandpa's House",
    color: "#ffd166",
  },
  {
    id: "e8",
    memberId: "m_mia",
    title: "Mia Ballet Class",
    date: "2026-09-17",
    time: "4:00 PM",
    duration: "1 hr",
    location: "Studio B",
    color: "#f59e0b",
  },
  {
    id: "e9",
    memberId: "m_mom",
    title: "Book Club Meeting",
    date: "2026-09-15",
    time: "7:00 PM",
    duration: "2 hr",
    location: "Sarah's Place",
    color: "#ec4899",
  },
  {
    id: "e10",
    memberId: "all",
    title: "Labor Day Family BBQ",
    date: "2026-09-07",
    time: "1:00 PM",
    duration: "4 hr",
    location: "Backyard",
    color: "#ffd166",
  },
  {
    id: "e11",
    memberId: "m_leo",
    title: "School Science Fair",
    date: "2026-09-30",
    time: "6:00 PM",
    duration: "2 hr",
    location: "School Auditorium",
    color: "#8b5cf6",
  },
];

interface CalendarViewProps {
  accessMode: AccessMode;
}

export function CalendarView({ accessMode }: CalendarViewProps) {
  // Default view is "month" as requested!
  const [viewType, setViewType] = useState<"month" | "week" | "day" | "schedule">("month");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 is September (0-indexed)
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Filter events by member
  const filteredEvents =
    selectedMemberId === "all"
      ? INITIAL_MONTH_EVENTS
      : INITIAL_MONTH_EVENTS.filter((e) => e.memberId === selectedMemberId);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September 2026
  };

  // Build physical calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells: {
    dayNum: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = currentYear === 2026 && currentMonth === 8 && d === 21;
    calendarCells.push({
      dayNum: d,
      dateStr,
      isCurrentMonth: true,
      isToday,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    calendarCells.push({
      dayNum: n,
      dateStr,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Events for selected modal date
  const selectedDateEvents = selectedDayModal
    ? filteredEvents.filter((e) => e.date === selectedDayModal)
    : [];

  const formatModalHeaderDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-4 md:p-6 overflow-hidden">
      {/* Top Filter Bar: Family Members & Cosmic View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cosmos-border">
        {/* Family Member Constellation Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {SAMPLE_MEMBERS.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-bold text-xs tracking-wide transition-all ${
                  isSelected
                    ? "bg-cosmos-card text-white border-2 shadow-lg shadow-purple-500/20"
                    : "bg-cosmos-surface/80 text-slate-400 border border-cosmos-border hover:bg-cosmos-cardHover hover:text-slate-200"
                }`}
                style={{
                  borderColor: isSelected ? member.color : undefined,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{
                    backgroundColor: member.color,
                    boxShadow: isSelected ? `0 0 8px ${member.color}` : "none",
                  }}
                />
                <span>{member.name}</span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Add Event */}
        <div className="flex items-center gap-3">
          <div className="flex bg-cosmos-surface p-1 rounded-xl border border-cosmos-border text-xs font-bold">
            {(["month", "week", "day", "schedule"] as const).map((vt) => (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  viewType === vt
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {vt}
              </button>
            ))}
          </div>

          {accessMode !== "kid" && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-purple-500/25 transition">
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Navigator Header */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-purple-200 to-starlight">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-starlight" />
            {filteredEvents.length} Events
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-slate-300 hover:text-white hover:bg-cosmos-cardHover transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-starlight hover:text-white hover:bg-cosmos-cardHover transition"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-slate-300 hover:text-white hover:bg-cosmos-cardHover transition"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIEW 1: Physical Calendar Monthly Grid (DEFAULT) */}
      {viewType === "month" && (
        <div className="flex-1 flex flex-col min-h-0 border border-cosmos-border rounded-2xl overflow-hidden bg-cosmos-deep/70 backdrop-blur-md">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-cosmos-border bg-cosmos-surface/90 text-center text-xs font-black text-slate-400 py-2.5 tracking-wider">
            {dayLabels.map((day) => (
              <div key={day} className="truncate">
                {day}
              </div>
            ))}
          </div>

          {/* 7-Column Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-cosmos-border/70 overflow-hidden">
            {calendarCells.map((cell) => {
              const dayEvents = filteredEvents.filter(
                (e) => e.date === cell.dateStr
              );

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDayModal(cell.dateStr)}
                  className={`cursor-pointer p-1.5 flex flex-col justify-start overflow-hidden transition-all select-none relative group ${
                    cell.isCurrentMonth
                      ? "bg-cosmos-deep hover:bg-cosmos-card/80"
                      : "bg-cosmos-void/60 text-slate-600 hover:bg-cosmos-deep/50"
                  }`}
                >
                  {/* Top Bar: Date Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                        cell.isToday
                          ? "bg-starlight text-cosmos-void font-extrabold shadow-md shadow-starlight/40 scale-105"
                          : cell.isCurrentMonth
                          ? "text-slate-300 group-hover:text-white"
                          : "text-slate-600"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {cell.isToday && (
                      <span className="text-[10px] font-bold text-starlight uppercase tracking-tight hidden sm:inline">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Event Pills inside Day Cell */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className="truncate text-[11px] font-bold px-1.5 py-0.5 rounded-md border text-white transition hover:scale-[1.02]"
                        style={{
                          backgroundColor: `${evt.color}25`,
                          borderColor: `${evt.color}60`,
                          color: evt.color,
                        }}
                      >
                        <span className="opacity-70 font-mono text-[10px] mr-1">
                          {evt.time.replace(":00", "").toLowerCase()}
                        </span>
                        <span>{evt.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] font-extrabold text-starlight-cyan px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Single Day Column View */}
      {viewType === "day" && (
        <div className="flex-1 flex flex-col overflow-y-auto space-y-3 pr-2">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xl font-bold text-white">Monday, Sep 21 — Family Schedule</h3>
            <button
              onClick={() => setViewType("month")}
              className="text-xs font-bold text-starlight hover:underline flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Back to Month View
            </button>
          </div>
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between shadow-lg"
              style={{ borderLeftWidth: "6px", borderLeftColor: evt.color }}
            >
              <div>
                <span className="text-lg font-bold text-white block">{evt.title}</span>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {evt.time} ({evt.duration})
                  </span>
                  {evt.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {evt.location}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ backgroundColor: `${evt.color}22`, color: evt.color }}
              >
                {SAMPLE_MEMBERS.find((m) => m.id === evt.memberId)?.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: Week View */}
      {viewType === "week" && (
        <div className="flex-1 flex flex-col overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xl font-bold text-white">Week of Sep 21 - Sep 27</h3>
            <button
              onClick={() => setViewType("month")}
              className="text-xs font-bold text-starlight hover:underline flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Back to Month View
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {["Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26", "Sep 27"].map(
              (dayStr, idx) => (
                <div
                  key={dayStr}
                  className="p-3 rounded-2xl bg-cosmos-card border border-cosmos-border flex flex-col gap-2"
                >
                  <span className="text-xs font-bold text-starlight uppercase">
                    {dayLabels[(idx + 1) % 7]} — {dayStr}
                  </span>
                  <div className="space-y-1.5">
                    {filteredEvents
                      .filter((e) => e.date === `2026-09-${21 + idx}`)
                      .map((evt) => (
                        <div
                          key={evt.id}
                          className="text-xs p-1.5 rounded-lg border font-medium text-white"
                          style={{
                            backgroundColor: `${evt.color}20`,
                            borderColor: `${evt.color}50`,
                          }}
                        >
                          <span className="font-bold block">{evt.title}</span>
                          <span className="text-[10px] text-slate-300">{evt.time}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: Schedule View */}
      {viewType === "schedule" && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-3 h-10 rounded-full"
                  style={{ backgroundColor: evt.color }}
                />
                <div>
                  <span className="text-base font-bold text-white">{evt.title}</span>
                  <span className="text-xs text-slate-400 block">
                    {evt.date} at {evt.time}
                  </span>
                </div>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ backgroundColor: `${evt.color}22`, color: evt.color }}
              >
                {SAMPLE_MEMBERS.find((m) => m.id === evt.memberId)?.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* DAY DETAIL MODAL: Opened when clicking any day in Month View */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cosmos-border">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-starlight">
                  Day Overview
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  {formatModalHeaderDate(selectedDayModal)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Events List for this Day */}
            <div className="my-4 max-h-72 overflow-y-auto space-y-3 pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-sm font-semibold">No events scheduled for this date.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Enjoy family free time or tap Add Event to schedule something!
                  </p>
                </div>
              ) : (
                selectedDateEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-cosmos-surface border border-cosmos-border flex items-center justify-between"
                    style={{ borderLeftWidth: "5px", borderLeftColor: evt.color }}
                  >
                    <div>
                      <span className="text-sm font-bold text-white block">{evt.title}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {evt.time} ({evt.duration})
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ backgroundColor: `${evt.color}20`, color: evt.color }}
                    >
                      {SAMPLE_MEMBERS.find((m) => m.id === evt.memberId)?.name}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions: Jump into Day View or Week View */}
            <div className="pt-3 border-t border-cosmos-border flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewType("day");
                    setSelectedDayModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-200 transition flex items-center gap-1.5"
                >
                  <Columns className="w-3.5 h-3.5 text-starlight-cyan" />
                  <span>View as Day</span>
                </button>
                <button
                  onClick={() => {
                    setViewType("week");
                    setSelectedDayModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-200 transition flex items-center gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-starlight-purple" />
                  <span>View as Week</span>
                </button>
              </div>

              {accessMode !== "kid" && (
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-md shadow-purple-500/20 transition flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
