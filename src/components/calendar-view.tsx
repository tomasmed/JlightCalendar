"use client";

import React, { useState, useEffect } from "react";
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

// Generate dynamic sample events centered on current date
function generateDynamicEvents(baseDate: Date): CalendarEvent[] {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();

  const toStr = (year: number, month: number, day: number) => {
    const dt = new Date(year, month, day);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  return [
    {
      id: "e1",
      memberId: "mem_leo",
      title: "Leo Soccer Practice",
      date: toStr(y, m, d),
      time: "4:30 PM",
      duration: "1 hr",
      location: "Community Field 2",
      color: "#8b5cf6",
    },
    {
      id: "e2",
      memberId: "mem_mom",
      title: "Parent-Teacher Conference",
      date: toStr(y, m, d),
      time: "2:00 PM",
      duration: "30 min",
      location: "Lincoln Elementary",
      color: "#ec4899",
    },
    {
      id: "e3",
      memberId: "all",
      title: "Family Taco Night 🌮",
      date: toStr(y, m, d),
      time: "6:30 PM",
      duration: "1 hr",
      location: "Home",
      color: "#ffd166",
    },
    {
      id: "e4",
      memberId: "mem_mia",
      title: "Mia Gymnastics",
      date: toStr(y, m, d + 1),
      time: "5:15 PM",
      duration: "45 min",
      location: "YMCA Gym A",
      color: "#f59e0b",
    },
    {
      id: "e5",
      memberId: "mem_dad",
      title: "Dentist Cleaning",
      date: toStr(y, m, d + 2),
      time: "10:00 AM",
      duration: "1 hr",
      location: "Downtown Dental",
      color: "#10b981",
    },
    {
      id: "e6",
      memberId: "mem_java",
      title: "Java Annual Vet Checkup 🐾",
      date: toStr(y, m, d + 3),
      time: "2:30 PM",
      duration: "1 hr",
      location: "Healthy Paws Veterinary",
      color: "#06b6d4",
    },
    {
      id: "e7",
      memberId: "mem_leo",
      title: "Soccer Match vs Hawks",
      date: toStr(y, m, d + 4),
      time: "10:00 AM",
      duration: "1.5 hr",
      location: "West Field 4",
      color: "#8b5cf6",
    },
    {
      id: "e8",
      memberId: "all",
      title: "Grandparents Sunday Dinner",
      date: toStr(y, m, d + 5),
      time: "4:00 PM",
      duration: "3 hr",
      location: "Grandma & Grandpa's House",
      color: "#ffd166",
    },
    {
      id: "e9",
      memberId: "mem_mia",
      title: "Mia Ballet Class",
      date: toStr(y, m, d - 2),
      time: "4:00 PM",
      duration: "1 hr",
      location: "Studio B",
      color: "#f59e0b",
    },
    {
      id: "e10",
      memberId: "mem_mom",
      title: "Book Club Meeting",
      date: toStr(y, m, d - 4),
      time: "7:00 PM",
      duration: "2 hr",
      location: "Sarah's Place",
      color: "#ec4899",
    },
  ];
}

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
  onRemoveInhabitant?: (memberId: string) => Promise<void>;
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
  onRemoveInhabitant,
}: CalendarViewProps) {
  const [viewType, setViewType] = useState<"month" | "week" | "day" | "schedule">("month");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  // Real live date state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [todayDate, setTodayDate] = useState<Date>(() => new Date());
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null);

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Modals from PR #3
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEventData | null>(null);
  const [targetDateForNewEvent, setTargetDateForNewEvent] = useState<string>("");
  const [isInhabitantsModalOpen, setIsInhabitantsModalOpen] = useState(false);

  // Sync date on mount
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayDate(now);
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const toDateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const todayStr = toDateStr(todayDate);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const isSolDemoGalaxy = activeGalaxyId === "galaxy_sol_family";

  // Normalize Inhabitants: If DB provided, map to member items; else fallback to SAMPLE_MEMBERS ONLY for demo
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
      : isSolDemoGalaxy
      ? SAMPLE_MEMBERS.filter((m) => m.id !== "all")
      : []),
  ];

  // Inhabitants state for modals: only Sol demo galaxy falls back to mock Mom/Dad/Leo/Mia/Java
  const modalInhabitants: Inhabitant[] =
    inhabitants.length > 0
      ? inhabitants
      : isSolDemoGalaxy
      ? [
          { id: "mem_mom", galaxyId: activeGalaxyId, displayName: "Mom", role: "admin", color: "#ec4899", avatarIcon: "user", starBalance: 0 },
          { id: "mem_dad", galaxyId: activeGalaxyId, displayName: "Dad", role: "admin", color: "#10b981", avatarIcon: "user", starBalance: 0 },
          { id: "mem_leo", galaxyId: activeGalaxyId, displayName: "Leo", role: "kid", color: "#8b5cf6", avatarIcon: "baby", starBalance: 18 },
          { id: "mem_mia", galaxyId: activeGalaxyId, displayName: "Mia", role: "kid", color: "#f59e0b", avatarIcon: "baby", starBalance: 24 },
          { id: "mem_java", galaxyId: activeGalaxyId, displayName: "Java 🐕", role: "pet", color: "#06b6d4", avatarIcon: "dog", starBalance: 0 },
        ]
      : [];

  // Events: Map passed events; only Sol demo galaxy with undefined events generates dynamic sample events
  const calendarEvents: CalendarEvent[] =
    propEvents !== undefined
      ? propEvents.map((pe) => {
          const dateStr = pe.startTime.split("T")[0] || todayStr;
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
      : isSolDemoGalaxy
      ? generateDynamicEvents(todayDate)
      : [];

  // Filter events by member
  const filteredEvents =
    selectedMemberId === "all"
      ? calendarEvents
      : calendarEvents.filter((e) => e.memberId === selectedMemberId || e.memberId === null);

  // Unified lateral navigation
  const prevPeriod = () => {
    setCurrentDate((prev) => {
      if (viewType === "week") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7);
      } else if (viewType === "day") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      if (viewType === "week") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7);
      } else if (viewType === "day") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
    });
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setTodayDate(now);
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        nextPeriod();
      } else {
        prevPeriod();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Build physical calendar grid days for month view
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
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      dayNum: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells =
    calendarCells.length <= 35 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    calendarCells.push({
      dayNum: n,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Calculate dynamic 7-day week days for week view
  const currentDayOfWeek = currentDate.getDay(); // 0 is Sunday
  const weekStart = new Date(
    currentYear,
    currentMonth,
    currentDate.getDate() - currentDayOfWeek
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + i
    );
    const dateStr = toDateStr(d);
    return {
      date: d,
      dateStr,
      dayLabel: dayLabels[i],
      shortStr: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      isToday: dateStr === todayStr,
    };
  });

  const weekRangeTitle = `Week of ${weekDays[0].shortStr} – ${weekDays[6].shortStr}, ${weekDays[6].date.getFullYear()}`;

  // Events for selected modal date
  const selectedDateEvents = selectedDayModal
    ? calendarEvents.filter((e) => e.date === selectedDayModal)
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
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-2 sm:p-4 md:p-6 overflow-hidden"
    >
      {/* Event Add/Modify Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        activeGalaxyId={activeGalaxyId}
        selectedDate={targetDateForNewEvent}
        eventToEdit={eventToEdit}
        inhabitants={modalInhabitants}
        accessMode={accessMode}
        onSaveEvent={onSaveEvent || (async () => {})}
        onDeleteEvent={onDeleteEvent}
      />

      {/* Inhabitants & Pets Modal */}
      <InhabitantsModal
        isOpen={isInhabitantsModalOpen}
        onClose={() => setIsInhabitantsModalOpen(false)}
        galaxyName={activeGalaxyName}
        inhabitants={modalInhabitants}
        accessMode={accessMode}
        onAddInhabitant={onAddInhabitant || (async () => {})}
        onRemoveInhabitant={onRemoveInhabitant}
      />

      {/* Top Filter Bar: Family Members & Cosmic View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 pb-2 md:pb-4 border-b border-cosmos-border">
        {/* Family Member Constellation Filter */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 max-w-full">
          {memberList.map((member) => {
            const isSelected = selectedMemberId === member.id;
            const Icon = getInhabitantIcon(member.avatarIcon);

            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-2xl font-bold text-xs tracking-wide transition-all min-h-[44px] shrink-0 ${
                  isSelected
                    ? "bg-cosmos-card text-white border-2 shadow-lg shadow-purple-500/20"
                    : "bg-cosmos-surface/80 text-slate-400 border border-cosmos-border hover:bg-cosmos-cardHover hover:text-slate-200"
                }`}
                style={{
                  borderColor: isSelected ? member.color : undefined,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0"
                  style={{
                    backgroundColor: member.color,
                    boxShadow: isSelected ? `0 0 8px ${member.color}` : "none",
                  }}
                >
                  <Icon className="w-2.5 h-2.5 text-cosmos-void" />
                </div>
                <span className="whitespace-nowrap">{member.name}</span>
              </button>
            );
          })}

          {accessMode !== "kid" && (
            <button
              onClick={() => setIsInhabitantsModalOpen(true)}
              title="Manage Galaxy Inhabitants"
              className="px-2.5 py-1.5 rounded-2xl border border-dashed border-cosmos-border text-slate-400 hover:text-starlight hover:border-purple-400 transition text-xs font-bold flex items-center gap-1 min-h-[44px] shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Manage</span>
            </button>
          )}
        </div>

        {/* View Switcher & Add Event */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex bg-cosmos-surface p-1 rounded-xl border border-cosmos-border text-xs font-bold">
            {(["month", "week", "day", "schedule"] as const).map((vt) => (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                className={`px-2.5 md:px-3 py-1.5 rounded-lg capitalize transition min-h-[40px] flex items-center justify-center ${
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
            <button
              onClick={() => handleOpenAddEventOnDate(todayStr)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-purple-500/25 transition min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Navigator Header */}
      <div className="flex items-center justify-between py-2 md:py-3">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-purple-200 to-starlight">
            {viewType === "week"
              ? weekRangeTitle
              : viewType === "day"
              ? currentDate.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : `${monthNames[currentMonth]} ${currentYear}`}
          </h2>
          <span className="hidden sm:flex text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30 items-center gap-1">
            <Sparkles className="w-3 h-3 text-starlight" />
            {filteredEvents.length} Events
          </span>
        </div>

        {/* Lateral Navigation Controls (with 48px touch targets) */}
        <div className="flex items-center gap-1 md:gap-1.5">
          <button
            onClick={prevPeriod}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-cosmos-surface border border-cosmos-border text-slate-300 hover:text-white hover:bg-cosmos-cardHover transition cursor-pointer"
            title="Previous (or Swipe Left)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="min-h-[48px] px-3.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-starlight hover:text-white hover:bg-cosmos-cardHover transition cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={nextPeriod}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-cosmos-surface border border-cosmos-border text-slate-300 hover:text-white hover:bg-cosmos-cardHover transition cursor-pointer"
            title="Next (or Swipe Right)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIEW 1: Physical Calendar Monthly Grid (DEFAULT) */}
      {viewType === "month" && (
        <div className="flex-1 flex flex-col min-h-0 border border-cosmos-border rounded-2xl overflow-hidden bg-cosmos-deep/70 backdrop-blur-md">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-cosmos-border bg-cosmos-surface/90 text-center text-[10px] sm:text-xs font-black text-slate-400 py-1.5 sm:py-2.5 tracking-wider">
            {dayLabels.map((day) => (
              <div key={day} className="truncate">
                {day}
              </div>
            ))}
          </div>

          {/* 7-Column Days Grid */}
          <div
            className={`flex-1 grid grid-cols-7 ${
              calendarCells.length > 35 ? "grid-rows-6" : "grid-rows-5"
            } gap-px bg-cosmos-border/70 overflow-hidden`}
          >
            {calendarCells.map((cell) => {
              const dayEvents = filteredEvents.filter(
                (e) => e.date === cell.dateStr
              );

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDayModal(cell.dateStr)}
                  className={`cursor-pointer p-1 sm:p-1.5 flex flex-col justify-start overflow-hidden transition-all select-none relative group ${
                    cell.isCurrentMonth
                      ? "bg-cosmos-deep hover:bg-cosmos-card/80"
                      : "bg-cosmos-void/60 text-slate-600 hover:bg-cosmos-deep/50"
                  }`}
                >
                  {/* Top Bar: Date Number */}
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <span
                      className={`text-xs font-black px-1 sm:px-1.5 py-0.5 rounded-md ${
                        cell.isToday
                          ? "bg-purple-600 text-white font-extrabold shadow-md shadow-purple-500/50 ring-2 ring-starlight scale-105"
                          : cell.isCurrentMonth
                          ? "text-slate-300 group-hover:text-white"
                          : "text-slate-600"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {cell.isToday && (
                      <span className="text-[9px] font-bold text-starlight uppercase tracking-tight hidden md:inline">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Tablet & Desktop: Event Pills */}
                  <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => handleOpenEditEvent(evt, e)}
                        className="truncate text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md border text-white transition hover:scale-[1.02]"
                        style={{
                          backgroundColor: `${evt.color}25`,
                          borderColor: `${evt.color}60`,
                          color: evt.color,
                        }}
                      >
                        <span className="opacity-70 font-mono text-[9px] mr-1">
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

                  {/* Mobile (~Galaxy S26): Constellation Event Indicator Dots */}
                  <div className="sm:hidden flex flex-wrap gap-1 mt-auto items-center">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{
                          backgroundColor: evt.color,
                          boxShadow: `0 0 4px ${evt.color}`,
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-extrabold text-starlight leading-none">
                        +{dayEvents.length - 3}
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
            <h3 className="text-lg md:text-xl font-bold text-white">
              {currentDate.toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              — Schedule
            </h3>
            <button
              onClick={() => setViewType("month")}
              className="text-xs font-bold text-starlight hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Back to Month View
            </button>
          </div>
          {filteredEvents.filter((e) => e.date === toDateStr(currentDate)).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-400" />
              <p className="text-sm font-semibold">No events scheduled for this date.</p>
            </div>
          ) : (
            filteredEvents
              .filter((e) => e.date === toDateStr(currentDate))
              .map((evt) => (
                <div
                  key={evt.id}
                  onClick={(e) => handleOpenEditEvent(evt, e)}
                  className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between shadow-lg cursor-pointer hover:bg-cosmos-cardHover transition"
                  style={{ borderLeftWidth: "6px", borderLeftColor: evt.color }}
                >
                  <div>
                    <span className="text-base md:text-lg font-bold text-white block">
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
                    {memberList.find((m) => m.id === evt.memberId)?.name || "Family"}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {/* VIEW 3: Dynamic Week View */}
      {viewType === "week" && (
        <div className="flex-1 flex flex-col overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">
              {weekRangeTitle}
            </h3>
            <button
              onClick={() => setViewType("month")}
              className="text-xs font-bold text-starlight hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Back to Month View
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayEvts = filteredEvents.filter((e) => e.date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDayModal(day.dateStr)}
                  className={`p-3 rounded-2xl bg-cosmos-card border flex flex-col gap-2 cursor-pointer transition hover:bg-cosmos-cardHover ${
                    day.isToday
                      ? "border-purple-500/80 shadow-lg shadow-purple-500/20 ring-1 ring-starlight"
                      : "border-cosmos-border"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-cosmos-border/50 pb-1.5">
                    <span
                      className={`text-xs font-black uppercase ${
                        day.isToday ? "text-starlight font-extrabold" : "text-slate-300"
                      }`}
                    >
                      {day.dayLabel} — {day.shortStr}
                    </span>
                    {day.isToday && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 min-h-[40px]">
                    {dayEvts.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic block py-1">
                        No events
                      </span>
                    ) : (
                      dayEvts.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={(e) => handleOpenEditEvent(evt, e)}
                          className="text-xs p-1.5 rounded-lg border font-medium text-white transition hover:scale-[1.01]"
                          style={{
                            backgroundColor: `${evt.color}20`,
                            borderColor: `${evt.color}50`,
                          }}
                        >
                          <span className="font-bold block truncate">{evt.title}</span>
                          <span className="text-[10px] text-slate-300">{evt.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
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
              className="p-4 rounded-2xl bg-cosmos-card border border-cosmos-border flex items-center justify-between cursor-pointer hover:bg-cosmos-cardHover transition"
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
                {memberList.find((m) => m.id === evt.memberId)?.name || "Family"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* DAY DETAIL MODAL */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cosmos-border">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-starlight">
                  Day Overview
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-white">
                  {formatModalHeaderDate(selectedDayModal)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                    onClick={(e) => {
                      setSelectedDayModal(null);
                      handleOpenEditEvent(evt, e);
                    }}
                    className="p-3.5 rounded-2xl bg-cosmos-surface border border-cosmos-border flex items-center justify-between cursor-pointer hover:bg-cosmos-cardHover transition"
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
                      {memberList.find((m) => m.id === evt.memberId)?.name || "Family"}
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
                    const [y, m, d] = selectedDayModal.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
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
                    const [y, m, d] = selectedDayModal.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
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
                    const date = selectedDayModal;
                    setSelectedDayModal(null);
                    handleOpenAddEventOnDate(date, e);
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
