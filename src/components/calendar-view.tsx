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
  Sparkles,
  LayoutGrid,
  Columns,
  List,
  User,
  Baby,
  Dog,
  Cat,
  Users,
} from "lucide-react";
import { AccessMode } from "./kiosk-header";
import { Inhabitant, InhabitantsModal } from "./inhabitants-modal";
import { EventModal, CalendarEventData } from "./event-modal";

export interface Member {
  id: string;
  name: string;
  color: string;
  role?: string;
  avatarIcon?: string;
}

export const SAMPLE_MEMBERS: Member[] = [
  { id: "all", name: "All Family", color: "#ffd166", avatarIcon: "sparkles" },
  { id: "mem_mom", name: "Mom", color: "#ec4899", avatarIcon: "user" },
  { id: "mem_dad", name: "Dad", color: "#10b981", avatarIcon: "user" },
  { id: "mem_leo", name: "Leo", color: "#8b5cf6", avatarIcon: "baby" },
  { id: "mem_mia", name: "Mia", color: "#f59e0b", avatarIcon: "baby" },
  { id: "mem_java", name: "Java 🐕", color: "#06b6d4", avatarIcon: "dog" },
];

export interface CalendarEvent {
  id: string;
  galaxyId?: string;
  calendarId?: string;
  memberId: string | null;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  duration: string;
  location?: string | null;
  description?: string | null;
  color: string;
}

export const INITIAL_MONTH_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    memberId: "mem_leo",
    title: "Leo Soccer Practice",
    date: "2026-09-21",
    time: "4:30 PM",
    duration: "1 hr",
    location: "Community Field 2",
    color: "#8b5cf6",
  },
  {
    id: "e2",
    memberId: "mem_mom",
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
    title: "Family Taco Night 🌮",
    date: "2026-09-21",
    time: "6:30 PM",
    duration: "1 hr",
    location: "Home",
    color: "#ffd166",
  },
  {
    id: "e4",
    memberId: "mem_mia",
    title: "Mia Gymnastics",
    date: "2026-09-22",
    time: "5:15 PM",
    duration: "45 min",
    location: "YMCA Gym A",
    color: "#f59e0b",
  },
  {
    id: "e5",
    memberId: "mem_dad",
    title: "Dentist Cleaning",
    date: "2026-09-23",
    time: "10:00 AM",
    duration: "1 hr",
    location: "Downtown Dental",
    color: "#10b981",
  },
  {
    id: "e6",
    memberId: "mem_java",
    title: "Java Annual Vet Checkup 🐾",
    date: "2026-09-24",
    time: "2:30 PM",
    duration: "1 hr",
    location: "Healthy Paws Veterinary",
    color: "#06b6d4",
  },
  {
    id: "e7",
    memberId: "mem_leo",
    title: "Soccer Match vs Hawks",
    date: "2026-09-26",
    time: "10:00 AM",
    duration: "1.5 hr",
    location: "West Field 4",
    color: "#8b5cf6",
  },
  {
    id: "e8",
    memberId: "all",
    title: "Sunday Family Dinner",
    date: "2026-09-27",
    time: "4:00 PM",
    duration: "3 hr",
    location: "Grandma & Grandpa's House",
    color: "#ffd166",
  },
];

interface CalendarViewProps {
  accessMode: AccessMode;
  activeGalaxyId?: string;
  activeGalaxyName?: string;
  inhabitants?: Inhabitant[];
  events?: CalendarEventData[];
  onSaveEvent?: (event: CalendarEventData) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onAddInhabitant?: (inhabitant: {
    displayName: string;
    role: "admin" | "member" | "kid" | "pet";
    color: string;
    avatarIcon: string;
  }) => Promise<void>;
}

export function CalendarView({
  accessMode,
  activeGalaxyId = "galaxy_sol_family",
  activeGalaxyName = "The Sol Family Galaxy",
  inhabitants = [],
  events: propEvents,
  onSaveEvent,
  onDeleteEvent,
  onAddInhabitant,
}: CalendarViewProps) {
  const [viewType, setViewType] = useState<
    "month" | "week" | "day" | "schedule"
  >("month");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 is September (0-indexed)
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEventData | null>(null);
  const [targetDateForNewEvent, setTargetDateForNewEvent] = useState<string>("");
  const [isInhabitantsModalOpen, setIsInhabitantsModalOpen] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Normalize Inhabitants: If DB provided, map to member items; else fallback to SAMPLE_MEMBERS
  const memberList: Member[] = [
    { id: "all", name: "All Family", color: "#ffd166", avatarIcon: "sparkles" },
    ...(inhabitants.length > 0
      ? inhabitants.map((inh) => ({
          id: inh.id,
          name: inh.displayName,
          color: inh.color,
          role: inh.role,
          avatarIcon: inh.avatarIcon,
        }))
      : SAMPLE_MEMBERS.filter((m) => m.id !== "all")),
  ];

  // Inhabitants state for modals
  const modalInhabitants: Inhabitant[] =
    inhabitants.length > 0
      ? inhabitants
      : [
          { id: "mem_mom", galaxyId: activeGalaxyId, displayName: "Mom", role: "admin", color: "#ec4899", avatarIcon: "user", starBalance: 0 },
          { id: "mem_dad", galaxyId: activeGalaxyId, displayName: "Dad", role: "admin", color: "#10b981", avatarIcon: "user", starBalance: 0 },
          { id: "mem_leo", galaxyId: activeGalaxyId, displayName: "Leo", role: "kid", color: "#8b5cf6", avatarIcon: "baby", starBalance: 18 },
          { id: "mem_mia", galaxyId: activeGalaxyId, displayName: "Mia", role: "kid", color: "#f59e0b", avatarIcon: "baby", starBalance: 24 },
          { id: "mem_java", galaxyId: activeGalaxyId, displayName: "Java 🐕", role: "pet", color: "#06b6d4", avatarIcon: "dog", starBalance: 0 },
        ];

  // Normalize Events
  const calendarEvents: CalendarEvent[] = propEvents
    ? propEvents.map((pe) => {
        const dateStr = pe.startTime.split("T")[0] || "2026-09-21";
        const timeStr = pe.startTime.includes("T")
          ? pe.startTime.split("T")[1]?.slice(0, 5) || "09:00"
          : "09:00";
        return {
          id: pe.id || crypto.randomUUID(),
          galaxyId: pe.galaxyId,
          calendarId: pe.calendarId,
          memberId: pe.memberId || null,
          title: pe.title,
          date: dateStr,
          time: timeStr,
          duration: "1 hr",
          location: pe.location,
          description: pe.description,
          color:
            pe.colorOverride ||
            inhabitants.find((i) => i.id === pe.memberId)?.color ||
            "#8b5cf6",
        };
      })
    : INITIAL_MONTH_EVENTS;

  // Filter events by member
  const filteredEvents =
    selectedMemberId === "all"
      ? calendarEvents
      : calendarEvents.filter(
          (e) => e.memberId === selectedMemberId || e.memberId === null
        );

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

  // Calendar Grid Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDaysCount - i,
      isCurrentMonth: false,
      dateString: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
        prevMonthDaysCount - i
      ).padStart(2, "0")}`,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`,
    });
  }

  // Next month leading days to fill 5 or 6 weeks (35 or 42 grid cells)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      dateString: `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`,
    });
  }

  const isToday = (dayObj: { isCurrentMonth: boolean; day: number }) => {
    return (
      dayObj.isCurrentMonth &&
      currentYear === 2026 &&
      currentMonth === 8 &&
      dayObj.day === 21
    );
  };

  const selectedDateEvents = selectedDayModal
    ? calendarEvents.filter((e) => e.date === selectedDayModal)
    : [];

  const formatModalHeaderDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const getInhabitantIcon = (iconName?: string) => {
    switch (iconName) {
      case "dog":
        return Dog;
      case "cat":
        return Cat;
      case "baby":
        return Baby;
      case "sparkles":
        return Sparkles;
      default:
        return User;
    }
  };

  // Open Event Modal to create new event on date
  const handleOpenAddEventOnDate = (dateStr: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (accessMode === "kid") {
      setSelectedDayModal(dateStr);
      return;
    }
    setEventToEdit(null);
    setTargetDateForNewEvent(dateStr);
    setIsEventModalOpen(true);
  };

  // Open Event Modal to edit event
  const handleOpenEditEvent = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToEdit({
      id: evt.id,
      galaxyId: evt.galaxyId || activeGalaxyId,
      calendarId: evt.calendarId,
      memberId: evt.memberId,
      title: evt.title,
      description: evt.description,
      location: evt.location,
      startTime: `${evt.date}T${evt.time.includes(":") ? evt.time : "09:00"}:00`,
      endTime: `${evt.date}T10:00:00`,
      colorOverride: evt.color,
    });
    setIsEventModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-full">
      {/* Event Add/Modify Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        selectedDate={targetDateForNewEvent}
        activeGalaxyId={activeGalaxyId}
        inhabitants={modalInhabitants}
        accessMode={accessMode}
        onSaveEvent={async (eventData) => {
          if (onSaveEvent) {
            await onSaveEvent(eventData);
          }
        }}
        onDeleteEvent={onDeleteEvent}
      />

      {/* Inhabitants & Pets Modal */}
      <InhabitantsModal
        isOpen={isInhabitantsModalOpen}
        onClose={() => setIsInhabitantsModalOpen(false)}
        galaxyName={activeGalaxyName}
        inhabitants={modalInhabitants}
        onAddInhabitant={async (newInh) => {
          if (onAddInhabitant) {
            await onAddInhabitant(newInh);
          }
        }}
      />

      {/* TOP CONTROLS BAR: Navigation, Today Button, Month/Week/Day Views, Member Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 select-none">
        {/* Left: Date Navigation with Celestial Accents */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-cosmos-card border border-cosmos-borderLight rounded-2xl p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={prevMonth}
              className="p-2.5 rounded-xl hover:bg-cosmos-surface text-slate-300 hover:text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3.5 py-1.5 rounded-xl hover:bg-cosmos-surface font-extrabold text-xs text-starlight hover:text-white transition uppercase tracking-wider min-h-[44px]"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2.5 rounded-xl hover:bg-cosmos-surface text-slate-300 hover:text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-sm">
            <span>{monthNames[currentMonth]}</span>
            <span className="text-slate-400 font-normal text-xl md:text-2xl">
              {currentYear}
            </span>
          </h2>
        </div>

        {/* Center: View Switcher (Month Grid default) */}
        <div className="flex items-center bg-cosmos-void/90 p-1.5 rounded-2xl border border-cosmos-border">
          <button
            onClick={() => setViewType("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition min-h-[40px] ${
              viewType === "month"
                ? "bg-purple-600/40 text-white border border-purple-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-starlight" />
            <span>Month</span>
          </button>
          <button
            onClick={() => setViewType("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition min-h-[40px] ${
              viewType === "week"
                ? "bg-purple-600/40 text-white border border-purple-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-4 h-4 text-starlight-cyan" />
            <span>Week</span>
          </button>
          <button
            onClick={() => setViewType("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition min-h-[40px] ${
              viewType === "schedule"
                ? "bg-purple-600/40 text-white border border-purple-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <List className="w-4 h-4 text-starlight-purple" />
            <span>Schedule</span>
          </button>
        </div>

        {/* Right: + Add Event Action (Disabled in Kid mode) */}
        {accessMode !== "kid" && (
          <button
            onClick={() => {
              setEventToEdit(null);
              setTargetDateForNewEvent("2026-09-21");
              setIsEventModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs tracking-wide shadow-lg shadow-purple-500/30 transition active:scale-95 min-h-[48px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        )}
      </div>

      {/* MEMBER & INHABITANT FILTER PILLS (Mom, Dad, Leo, Mia, Java the Dog!) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-starlight" /> Crew Filter:
        </span>
        {memberList.map((m) => {
          const isSelected = selectedMemberId === m.id;
          const Icon = getInhabitantIcon(m.avatarIcon);
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 min-h-[38px] ${
                isSelected
                  ? "bg-cosmos-surface border text-white shadow-md"
                  : "bg-cosmos-card/80 border border-cosmos-border/60 text-slate-400 hover:text-slate-200 hover:bg-cosmos-surface"
              }`}
              style={{
                borderColor: isSelected ? m.color : undefined,
                boxShadow: isSelected ? `0 0 12px ${m.color}40` : undefined,
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: m.color }}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>
              <span>{m.name}</span>
            </button>
          );
        })}

        {/* Quick Add Inhabitant Button */}
        {accessMode !== "kid" && (
          <button
            onClick={() => setIsInhabitantsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cosmos-surface/80 hover:bg-cosmos-card border border-cosmos-border hover:border-purple-500/40 text-xs font-bold text-starlight transition flex-shrink-0 min-h-[38px]"
            title="Manage Inhabitants & Pets"
          >
            <Users className="w-3.5 h-3.5" />
            <span>+ Inhabitant / Pet</span>
          </button>
        )}
      </div>

      {/* VIEW 1: Starry Night Monthly Grid */}
      {viewType === "month" && (
        <div className="flex-1 flex flex-col min-h-0 bg-cosmos-card/90 border border-cosmos-borderLight rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-cosmos-border bg-cosmos-deep/80 text-center py-2.5">
            {dayLabels.map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-black tracking-wider uppercase ${
                  idx === 0 || idx === 6 ? "text-purple-300/80" : "text-slate-400"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-[1px] bg-cosmos-border/40 overflow-hidden">
            {calendarDays.slice(0, 35).map((dayObj, index) => {
              const dayEvents = filteredEvents.filter(
                (e) => e.date === dayObj.dateString
              );
              const today = isToday(dayObj);

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDayModal(dayObj.dateString)}
                  className={`group relative flex flex-col p-1.5 md:p-2 transition-all cursor-pointer overflow-hidden ${
                    dayObj.isCurrentMonth
                      ? "bg-cosmos-card hover:bg-cosmos-surface/90"
                      : "bg-cosmos-deep/40 opacity-40 hover:opacity-70"
                  } ${
                    today
                      ? "ring-1 ring-inset ring-purple-500/70 bg-gradient-to-br from-purple-950/20 via-cosmos-card to-cosmos-card"
                      : ""
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs md:text-sm font-black flex items-center justify-center rounded-xl transition ${
                        today
                          ? "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white w-6 h-6 shadow-md shadow-purple-500/40"
                          : dayObj.isCurrentMonth
                          ? "text-slate-200 group-hover:text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {dayObj.day}
                    </span>

                    {/* Quick Add Event Hover Icon (Admin/Standard) */}
                    {accessMode !== "kid" && (
                      <button
                        onClick={(e) =>
                          handleOpenAddEventOnDate(dayObj.dateString, e)
                        }
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-cosmos-surface hover:bg-purple-600/30 text-slate-300 hover:text-white transition"
                        title="Add event on this date"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Day Events Preview Badges */}
                  <div className="flex-1 overflow-hidden space-y-1">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => handleOpenEditEvent(evt, e)}
                        className="px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-bold truncate flex items-center gap-1 border shadow-xs transition hover:brightness-125"
                        style={{
                          backgroundColor: `${evt.color}25`,
                          borderColor: `${evt.color}60`,
                          color: "#ffffff",
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: evt.color }}
                        />
                        <span className="truncate">{evt.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <span className="text-[9px] md:text-[10px] font-black text-starlight pl-1 block">
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
            <h3 className="text-xl font-bold text-white">
              Monday, Sep 21 — Galaxy Schedule
            </h3>
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
              onClick={(e) => handleOpenEditEvent(evt, e)}
              className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between shadow-lg cursor-pointer hover:border-purple-500/40 transition"
              style={{ borderLeftWidth: "6px", borderLeftColor: evt.color }}
            >
              <div>
                <span className="text-lg font-bold text-white block">
                  {evt.title}
                </span>
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
                {memberList.find((m) => m.id === evt.memberId)?.name || "All"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: Week View */}
      {viewType === "week" && (
        <div className="flex-1 flex flex-col overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xl font-bold text-white">
              Week of Sep 21 - Sep 27
            </h3>
            <button
              onClick={() => setViewType("month")}
              className="text-xs font-bold text-starlight hover:underline flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Back to Month View
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {[
              "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26", "Sep 27"
            ].map((dayStr, idx) => (
              <div
                key={dayStr}
                className="p-3 rounded-2xl bg-cosmos-card border border-cosmos-border flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-starlight uppercase">
                    {dayLabels[(idx + 1) % 7]} — {dayStr}
                  </span>
                  {accessMode !== "kid" && (
                    <button
                      onClick={(e) =>
                        handleOpenAddEventOnDate(`2026-09-${21 + idx}`, e)
                      }
                      className="p-1 text-slate-400 hover:text-white"
                      title="Add event"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {filteredEvents
                    .filter((e) => e.date === `2026-09-${21 + idx}`)
                    .map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => handleOpenEditEvent(evt, e)}
                        className="text-xs p-2 rounded-xl border font-medium text-white cursor-pointer hover:brightness-125 transition"
                        style={{
                          backgroundColor: `${evt.color}20`,
                          borderColor: `${evt.color}50`,
                        }}
                      >
                        <span className="font-bold block truncate">
                          {evt.title}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          {evt.time}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: Schedule View */}
      {viewType === "schedule" && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={(e) => handleOpenEditEvent(evt, e)}
              className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-3 h-10 rounded-full"
                  style={{ backgroundColor: evt.color }}
                />
                <div>
                  <span className="text-base font-bold text-white">
                    {evt.title}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    {evt.date} at {evt.time}
                  </span>
                </div>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ backgroundColor: `${evt.color}22`, color: evt.color }}
              >
                {memberList.find((m) => m.id === evt.memberId)?.name || "All"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* DAY OVERVIEW MODAL */}
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
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Events List for this Day */}
            <div className="my-4 max-h-72 overflow-y-auto space-y-3 pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-sm font-semibold">
                    No events scheduled for this date.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Enjoy family free time or tap Add Event to schedule something!
                  </p>
                </div>
              ) : (
                selectedDateEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={(e) => {
                      setSelectedDayModal(null);
                      handleOpenEditEvent(evt, e);
                    }}
                    className="p-3.5 rounded-2xl bg-cosmos-surface border border-cosmos-border flex items-center justify-between cursor-pointer hover:border-purple-500/40 transition"
                    style={{
                      borderLeftWidth: "5px",
                      borderLeftColor: evt.color,
                    }}
                  >
                    <div>
                      <span className="text-sm font-bold text-white block">
                        {evt.title}
                      </span>
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
                      style={{
                        backgroundColor: `${evt.color}20`,
                        color: evt.color,
                      }}
                    >
                      {memberList.find((m) => m.id === evt.memberId)?.name || "All"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-cosmos-border flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewType("day");
                    setSelectedDayModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-200 transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <Columns className="w-3.5 h-3.5 text-starlight-cyan" />
                  <span>View as Day</span>
                </button>
                <button
                  onClick={() => {
                    setViewType("week");
                    setSelectedDayModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-200 transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-starlight-purple" />
                  <span>View as Week</span>
                </button>
              </div>

              {accessMode !== "kid" && (
                <button
                  onClick={(e) => {
                    const d = selectedDayModal;
                    setSelectedDayModal(null);
                    handleOpenAddEventOnDate(d, e);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 min-h-[44px]"
                >
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
