"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Repeat,
} from "lucide-react";
import { AccessMode } from "./kiosk-header";
import {
  Inhabitant,
  InhabitantsModal,
  getCosmicAvatarIcon,
} from "./inhabitants-modal";
import { EventModal, CalendarEventData } from "./event-modal";
import { AgentProvenanceBadge } from "./agent-badge";
import {
  expandRecurringEvents,
  computeDurationMinutes,
  computeEventTimes,
  rruleToFrequency,
  formatLocalDate,
} from "@/lib/recurrence";
import { adaptMemberColor, useActiveTheme, AppTheme } from "@/lib/theme";

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
  baseEventId?: string;
  galaxyId?: string;
  calendarId?: string;
  memberId: string | null;
  memberIds?: string[] | null;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  rrule?: string | null;
  exdates?: string[] | string | null;
  duration: string;
  location?: string | null;
  description?: string | null;
  color: string;
  createdByAgentId?: string | null;
  agent?: any;
}

export function parseMemberIds(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      return [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

export function getEventColors(
  event: { memberId?: string | null; memberIds?: string[] | null; color?: string },
  inhabitants: { id: string; color: string }[],
  fallbackFamilyColor: string = "#ef4444",
  activeTheme?: AppTheme | string | null
): string[] {
  const ids = event.memberIds && event.memberIds.length > 0
    ? event.memberIds
    : event.memberId
    ? [event.memberId]
    : [];

  let rawColors: string[];
  if (ids.length === 0) {
    rawColors = [event.color || fallbackFamilyColor];
  } else {
    const colors = ids.map((id) => {
      const member = inhabitants.find((m) => m.id === id);
      return member?.color || event.color || fallbackFamilyColor;
    });
    rawColors = colors.length > 0 ? colors : [fallbackFamilyColor];
  }

  if (!activeTheme) {
    return rawColors;
  }

  return rawColors.map((c) => adaptMemberColor(c, activeTheme));
}

export function getEventBackgroundStyle(
  colors: string[],
  alphaHex: string = "22"
): { background: string; borderColor: string; primaryColor: string } {
  const primaryColor = colors[0] || "#ef4444";
  if (colors.length <= 1) {
    return {
      background: `linear-gradient(90deg, ${primaryColor}${alphaHex} 0%, rgb(var(--cosmos-card)) 88%)`,
      borderColor: `${primaryColor}55`,
      primaryColor,
    };
  }

  if (colors.length === 2) {
    return {
      background: `linear-gradient(135deg, ${colors[0]}${alphaHex} 0%, ${colors[0]}${alphaHex} 50%, ${colors[1]}${alphaHex} 50%, ${colors[1]}${alphaHex} 100%)`,
      borderColor: `${colors[0]}65`,
      primaryColor: colors[0],
    };
  }

  // 3 or more members: evenly segmented diagonal bands
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => {
    const start = (i * step).toFixed(1);
    const end = ((i + 1) * step).toFixed(1);
    return `${c}${alphaHex} ${start}%, ${c}${alphaHex} ${end}%`;
  });

  return {
    background: `linear-gradient(135deg, ${stops.join(", ")})`,
    borderColor: `${colors[0]}65`,
    primaryColor: colors[0],
  };
}

export function getEventSortKey(event: CalendarEvent): number {
  if (event.isAllDay || event.time?.toLowerCase() === "all day") {
    return -1;
  }
  if (event.time) {
    const match12 = event.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60 + mins;
    }
    const match24 = event.time.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const mins = parseInt(match24[2], 10);
      return hours * 60 + mins;
    }
  }
  if (event.startTime) {
    const d = new Date(event.startTime);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }
  return 0;
}

export function compareEventsByTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  const keyA = getEventSortKey(a);
  const keyB = getEventSortKey(b);
  if (keyA !== keyB) {
    return keyA - keyB;
  }
  return a.title.localeCompare(b.title);
}

export interface ParsedEventTime {
  startMinutes: number; // 0 to 1440
  endMinutes: number;   // 0 to 1440
  durationMinutes: number;
}

export function parseEventTimeMinutes(event: CalendarEvent): ParsedEventTime {
  let startMinutes = 540; // Default 9:00 AM (9 * 60)
  let durationMinutes = 60; // Default 60 mins

  if (event.startTime && event.startTime.includes("T")) {
    const timePart = event.startTime.split("T")[1];
    const [hh, mm] = timePart.split(":").map((v) => parseInt(v, 10));
    if (!isNaN(hh) && !isNaN(mm)) {
      startMinutes = hh * 60 + mm;
    }
  } else if (event.time) {
    const match12 = event.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      startMinutes = hours * 60 + mins;
    } else {
      const match24 = event.time.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        const hours = parseInt(match24[1], 10);
        const mins = parseInt(match24[2], 10);
        startMinutes = hours * 60 + mins;
      }
    }
  }

  if (event.startTime && event.endTime) {
    const diff = computeDurationMinutes(event.startTime, event.endTime, 0);
    if (diff > 0) {
      durationMinutes = diff;
    }
  } else if (event.duration) {
    const hrMatch = event.duration.match(/([\d.]+)\s*hr/i);
    const minMatch = event.duration.match(/(\d+)\s*min/i);
    if (hrMatch) {
      durationMinutes = Math.round(parseFloat(hrMatch[1]) * 60);
    } else if (minMatch) {
      durationMinutes = parseInt(minMatch[1], 10);
    }
  }

  if (durationMinutes < 15) durationMinutes = 15;
  const endMinutes = Math.min(1440, startMinutes + durationMinutes);

  return { startMinutes, endMinutes, durationMinutes };
}

export interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  colIndex: number;
  totalCols: number;
}

export function layoutDayEvents(events: CalendarEvent[], hourHeight: number): PositionedEvent[] {
  // Filter out all-day events from hourly column positioning
  const timed = events.filter((e) => !e.isAllDay && e.time?.toLowerCase() !== "all day");
  if (timed.length === 0) return [];

  const parsed = timed.map((event) => {
    const { startMinutes, endMinutes, durationMinutes } = parseEventTimeMinutes(event);
    return {
      event,
      startMinutes,
      endMinutes,
      durationMinutes,
      top: (startMinutes / 60) * hourHeight,
      height: Math.max(26, (durationMinutes / 60) * hourHeight),
    };
  });

  parsed.sort((a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes);

  // Group into overlapping clusters
  const clusters: (typeof parsed)[] = [];
  let currentCluster: typeof parsed = [];
  let clusterEnd = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMinutes;
    } else if (item.startMinutes < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Greedy column placement
  const result: PositionedEvent[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const clusterPositions: { item: typeof parsed[0]; col: number }[] = [];

    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.startMinutes) {
          colEnds[c] = item.endMinutes;
          clusterPositions.push({ item, col: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        colEnds.push(item.endMinutes);
        clusterPositions.push({ item, col: colEnds.length - 1 });
      }
    }

    const totalCols = Math.max(1, colEnds.length);
    for (const cp of clusterPositions) {
      result.push({
        event: cp.item.event,
        top: cp.item.top,
        height: cp.item.height,
        colIndex: cp.col,
        totalCols,
      });
    }
  }

  return result;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? "AM" : "PM";
  const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return {
    hour24: i,
    label: `${displayHour} ${ampm}`,
    timeStr: `${String(i).padStart(2, "0")}:00`,
  };
});

export const HOUR_HEIGHT = 64;

// Generate dynamic sample events centered on current date's Monday - Sunday
function generateDynamicEvents(baseDate: Date): CalendarEvent[] {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();

  const toStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const dayOffset = (baseDate.getDay() + 6) % 7;
  const monday = new Date(y, m, d - dayOffset);
  const getDayDate = (offset: number) => {
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset);
  };

  const monStr = toStr(getDayDate(0));
  const tueStr = toStr(getDayDate(1));
  const wedStr = toStr(getDayDate(2));
  const thuStr = toStr(getDayDate(3));
  const friStr = toStr(getDayDate(4));
  const satStr = toStr(getDayDate(5));
  const sunStr = toStr(getDayDate(6));

  return [
    {
      id: "e-mon-sprint",
      memberId: "mem_dad",
      title: "Dad Architecture Sprint 💻",
      date: monStr,
      time: "1:00 PM",
      startTime: `${monStr}T13:00:00`,
      endTime: `${monStr}T17:00:00`,
      duration: "4 hrs",
      location: "Home Office",
      color: "#10b981",
    },
    {
      id: "e-mon-soccer",
      memberId: "mem_leo",
      title: "Leo Soccer Practice ⚽",
      date: monStr,
      time: "4:30 PM",
      startTime: `${monStr}T16:30:00`,
      endTime: `${monStr}T18:00:00`,
      duration: "1.5 hrs",
      location: "Community Field 2",
      color: "#8b5cf6",
    },
    {
      id: "e-tue-conf",
      memberId: "mem_mom",
      title: "Parent-Teacher Conference 🏫",
      date: tueStr,
      time: "2:00 PM",
      startTime: `${tueStr}T14:00:00`,
      endTime: `${tueStr}T15:00:00`,
      duration: "1 hr",
      location: "Lincoln Elementary",
      color: "#ec4899",
    },
    {
      id: "e-wed-taco",
      memberId: "all",
      title: "Family Taco Night 🌮",
      date: wedStr,
      time: "6:00 PM",
      startTime: `${wedStr}T18:00:00`,
      endTime: `${wedStr}T20:00:00`,
      duration: "2 hrs",
      location: "Kitchen",
      color: "#ffd166",
    },
    {
      id: "e-thu-gym",
      memberId: "mem_mia",
      title: "Mia Gymnastics 🤸",
      date: thuStr,
      time: "5:15 PM",
      startTime: `${thuStr}T17:15:00`,
      endTime: `${thuStr}T18:00:00`,
      duration: "45 min",
      location: "YMCA Gym A",
      color: "#f59e0b",
    },
    {
      id: "e-fri-dentist",
      memberId: "mem_dad",
      title: "Dentist Cleaning 🦷",
      date: friStr,
      time: "10:00 AM",
      startTime: `${friStr}T10:00:00`,
      endTime: `${friStr}T11:00:00`,
      duration: "1 hr",
      location: "Downtown Dental",
      color: "#10b981",
    },
    {
      id: "e-sat-camp",
      memberId: "all",
      title: "Cosmic Family Campout 🏕️",
      date: satStr,
      time: "All Day",
      isAllDay: true,
      startTime: `${satStr}T00:00:00`,
      endTime: `${satStr}T23:59:59`,
      duration: "All Day",
      location: "Pine Valley State Park",
      color: "#38bdf8",
    },
    {
      id: "e-sat-vet",
      memberId: "mem_java",
      title: "Java Vet Checkup 🐾",
      date: satStr,
      time: "10:30 AM",
      startTime: `${satStr}T10:30:00`,
      endTime: `${satStr}T11:45:00`,
      duration: "1.25 hrs",
      location: "Healthy Paws Veterinary",
      color: "#06b6d4",
    },
    {
      id: "e-sat-match",
      memberId: "mem_leo",
      title: "Soccer Match vs Hawks ⚽",
      date: satStr,
      time: "2:00 PM",
      startTime: `${satStr}T14:00:00`,
      endTime: `${satStr}T15:30:00`,
      duration: "1.5 hrs",
      location: "West Field 4",
      color: "#8b5cf6",
    },
    {
      id: "e-sun-dinner",
      memberId: "all",
      title: "Grandparents Sunday Dinner 🍝",
      date: sunStr,
      time: "2:00 PM",
      startTime: `${sunStr}T14:00:00`,
      endTime: `${sunStr}T18:00:00`,
      duration: "4 hrs",
      location: "Grandma & Grandpa's House",
      color: "#ffd166",
    },
  ];
}

interface CalendarViewProps {
  accessMode: AccessMode;
  activeGalaxyId?: string;
  activeGalaxyName?: string;
  familyColor?: string;
  familyAvatar?: string;
  inhabitants?: Inhabitant[];
  events?: CalendarEventData[];
  onSaveEvent?: (event: CalendarEventData) => Promise<void>;
  onDeleteEvent?: (id: string, exdate?: string) => Promise<void>;
  onUpdateFamilyIdentity?: (data: { familyColor: string; familyAvatar: string }) => Promise<void>;
  onAddInhabitant?: (inhabitant: {
    displayName: string;
    role: "admin" | "member" | "kid" | "pet";
    color: string;
    avatarIcon: string;
  }) => Promise<void>;
  onUpdateInhabitant?: (updatedMember: {
    id: string;
    displayName?: string;
    role?: "admin" | "member" | "kid" | "pet";
    color?: string;
    avatarIcon?: string;
  }) => Promise<void>;
  onRemoveInhabitant?: (memberId: string) => Promise<void>;
}

export function CalendarView({
  accessMode,
  activeGalaxyId = "galaxy_sol_family",
  activeGalaxyName = "The Sol Family Galaxy",
  familyColor = "#ef4444",
  familyAvatar = "planet",
  inhabitants = [],
  events: propEvents,
  onSaveEvent,
  onDeleteEvent,
  onUpdateFamilyIdentity,
  onAddInhabitant,
  onUpdateInhabitant,
  onRemoveInhabitant,
}: CalendarViewProps) {
  const activeTheme = useActiveTheme();
  const [viewType, setViewType] = useState<"month" | "week" | "day" | "schedule">("week");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  // Real live date state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [todayDate, setTodayDate] = useState<Date>(() => new Date());
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string>(() =>
    formatLocalDate(new Date())
  );

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEventData | null>(null);
  const [targetDateForNewEvent, setTargetDateForNewEvent] = useState<string>("");
  const [targetTimeForNewEvent, setTargetTimeForNewEvent] = useState<string>("09:00");
  const [isInhabitantsModalOpen, setIsInhabitantsModalOpen] = useState(false);

  // Week View Scroll Container Refs
  const weekGridRef = useRef<HTMLDivElement>(null);
  const weekHorizontalScrollRef = useRef<HTMLDivElement>(null);

  // Sync date on mount and default mobile (<640px) to Split Month + Live Agenda view
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayDate(now);
    setSelectedAgendaDate(formatLocalDate(now));
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setViewType("month");
    }
  }, []);

  // Auto-scroll to morning hours (7 AM or current hour) when viewing week
  useEffect(() => {
    if (weekGridRef.current && viewType === "week") {
      const now = new Date();
      const currentH = now.getHours();
      const targetHour = currentH >= 6 && currentH <= 21 ? Math.max(0, currentH - 1) : 7;
      weekGridRef.current.scrollTop = targetHour * HOUR_HEIGHT;
    }
  }, [viewType]);

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
  // Adapt each member's hue to the active theme's materiality (Creamy pastel vs OSL fluorescent vs Latte ink)
  const memberList: Member[] = [
    {
      id: "all",
      name: "All Family",
      color: adaptMemberColor(familyColor || "#ef4444", activeTheme),
      avatarIcon: familyAvatar || "planet",
    },
    ...(inhabitants.length > 0
      ? inhabitants.map((inh) => ({
          id: inh.id,
          name: inh.displayName,
          color: adaptMemberColor(inh.color, activeTheme),
          role: inh.role,
          avatarIcon: inh.avatarIcon,
        }))
      : isSolDemoGalaxy
      ? SAMPLE_MEMBERS.filter((m) => m.id !== "all").map((m) => ({
          ...m,
          color: adaptMemberColor(m.color, activeTheme),
        }))
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
  const rawCalendarEvents: CalendarEvent[] =
    propEvents !== undefined
      ? propEvents.map((pe) => {
          const dateStr = pe.startTime.split("T")[0] || todayStr;
          const isAllDay = Boolean(pe.isAllDay);
          const timeStr = isAllDay
            ? "All Day"
            : pe.startTime.includes("T")
            ? pe.startTime.split("T")[1]?.slice(0, 5) || "09:00"
            : "09:00";

          let durationStr = "1 hr";
          if (isAllDay) {
            durationStr = "All Day";
          } else if (pe.startTime && pe.endTime) {
            const diffMins = computeDurationMinutes(pe.startTime, pe.endTime, 60);
            if (diffMins > 0) {
              if (diffMins < 60) {
                durationStr = `${diffMins} min`;
              } else if (diffMins % 60 === 0) {
                const hrs = diffMins / 60;
                durationStr = `${hrs} hr${hrs > 1 ? "s" : ""}`;
              } else {
                durationStr = `${(diffMins / 60).toFixed(1)} hrs`;
              }
            }
          }

          const parsedIds = parseMemberIds(pe.memberIds);
          const primaryMemberId = parsedIds.length > 0 ? parsedIds[0] : pe.memberId || null;
          const assignedMember = inhabitants.find((i) => i.id === primaryMemberId);

          return {
            id: pe.id || crypto.randomUUID(),
            baseEventId: pe.id,
            galaxyId: pe.galaxyId,
            calendarId: pe.calendarId,
            memberId: primaryMemberId,
            memberIds: parsedIds.length > 0 ? parsedIds : pe.memberId ? [pe.memberId] : null,
            title: pe.title,
            date: dateStr,
            time: timeStr,
            startTime: pe.startTime,
            endTime: pe.endTime,
            isAllDay,
            rrule: pe.rrule || null,
            exdates: pe.exdates || null,
            duration: durationStr,
            location: pe.location,
            description: pe.description,
            color:
              pe.colorOverride ||
              assignedMember?.color ||
              (parsedIds.length === 0 ? familyColor : "#8b5cf6"),
            createdByAgentId: pe.createdByAgentId || null,
            agent: pe.agent || null,
          };
        })
      : isSolDemoGalaxy
      ? generateDynamicEvents(todayDate)
      : [];

  // Expand recurring events across a 5-month viewing buffer (-2 months to +3 months)
  const windowStart = new Date(currentYear, currentMonth - 2, 1);
  const windowEnd = new Date(currentYear, currentMonth + 3, 0);
  const calendarEvents = expandRecurringEvents(rawCalendarEvents, windowStart, windowEnd);

  // Filter events by member: if 'all', show everything; if specific member, show if event's memberIds include it or event has no members (family-wide)
  const filteredEvents =
    selectedMemberId === "all"
      ? calendarEvents
      : calendarEvents.filter((e) => {
          const ids = e.memberIds && e.memberIds.length > 0
            ? e.memberIds
            : e.memberId
            ? [e.memberId]
            : [];
          if (ids.length === 0) return true; // Whole-family event shows for everyone
          return ids.includes(selectedMemberId);
        });

  // Unified lateral navigation
  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const next =
        viewType === "week"
          ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7)
          : viewType === "day"
          ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1)
          : new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      setSelectedAgendaDate(toDateStr(next));
      return next;
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const next =
        viewType === "week"
          ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7)
          : viewType === "day"
          ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1)
          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedAgendaDate(toDateStr(next));
      return next;
    });
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setTodayDate(now);
    setSelectedAgendaDate(toDateStr(now));
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

    // Detect if the swipe began inside the scrollable week timetable grid
    const targetEl = e.target as HTMLElement | null;
    const isInsideWeekGrid = Boolean(targetEl?.closest(".week-grid-scroll-area"));

    // If inside week timetable, let native horizontal scroll operate without jumping weeks
    if (!isInsideWeekGrid && Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swiping right-to-left: go forward in time (next week / next month)
        nextPeriod();
      } else {
        // Swiping left-to-right: go backward in time (previous week / previous month)
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

  // Calculate dynamic 7-day week days for week view (Mon - Sun)
  // Sunday is 0, Monday is 1, ..., Saturday is 6
  // (day + 6) % 7 calculates days since Monday (0 for Monday, 6 for Sunday)
  const currentDayOfWeek = (currentDate.getDay() + 6) % 7;
  const weekStart = new Date(
    currentYear,
    currentMonth,
    currentDate.getDate() - currentDayOfWeek
  );
  const weekDayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
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
      dayLabel: weekDayLabels[i],
      shortStr: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      isToday: dateStr === todayStr,
    };
  });

  const weekRangeTitle = `Week of ${weekDays[0].shortStr} – ${weekDays[6].shortStr}, ${weekDays[6].date.getFullYear()}`;

  const scrollToDayColumn = (dayIndex: number) => {
    if (!weekHorizontalScrollRef.current) return;
    const container = weekHorizontalScrollRef.current;
    const timeColWidth = window.innerWidth < 640 ? 56 : 64;
    const totalColsWidth = container.scrollWidth - timeColWidth;
    const colWidth = totalColsWidth / 7;
    const targetLeft = Math.max(0, dayIndex * colWidth);
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  // Auto-scroll horizontally to today when week view loads on mobile / small screens
  useEffect(() => {
    if (viewType === "week") {
      const todayIdx = weekDays.findIndex((d) => d.isToday);
      if (todayIdx >= 0 && weekHorizontalScrollRef.current) {
        const timer = setTimeout(() => {
          scrollToDayColumn(todayIdx);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [viewType, currentDate]);

  // Events for selected modal date (tablet/desktop) and mobile split-month agenda date
  const selectedDateEvents = selectedDayModal
    ? calendarEvents.filter((e) => e.date === selectedDayModal).sort(compareEventsByTime)
    : [];

  const mobileAgendaEvents = filteredEvents
    .filter((e) => e.date === selectedAgendaDate)
    .sort(compareEventsByTime);

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

  const formatCompactAgendaDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const formatted = date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return dateStr === todayStr ? `Today • ${formatted}` : formatted;
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

  // Open Event Modal to create new event on date and time
  const handleOpenAddEventOnDate = (
    dateStr: string,
    timeOrEvent?: string | React.MouseEvent,
    maybeEvent?: React.MouseEvent
  ) => {
    let timeStr = "09:00";
    let e = maybeEvent;
    if (typeof timeOrEvent === "string") {
      timeStr = timeOrEvent;
    } else if (timeOrEvent) {
      e = timeOrEvent;
    }
    e?.stopPropagation();
    if (accessMode === "kid") {
      setSelectedDayModal(dateStr);
      return;
    }
    setEventToEdit(null);
    setTargetDateForNewEvent(dateStr);
    setTargetTimeForNewEvent(timeStr);
    setIsEventModalOpen(true);
  };

  // Open Event Modal to edit event
  const handleOpenEditEvent = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = evt.baseEventId || evt.id;
    const basePropEvent = propEvents?.find((pe) => pe.id === targetId);

    setEventToEdit({
      id: targetId,
      galaxyId: evt.galaxyId || activeGalaxyId,
      calendarId: evt.calendarId,
      memberId: evt.memberId,
      memberIds: evt.memberIds || (evt.memberId ? [evt.memberId] : null),
      title: evt.title,
      description: evt.description,
      location: evt.location,
      startTime:
        basePropEvent?.startTime ||
        evt.startTime ||
        (evt.isAllDay
          ? `${evt.date}T00:00:00`
          : `${evt.date}T${evt.time.includes(":") ? evt.time : "09:00"}:00`),
      endTime:
        basePropEvent?.endTime ||
        evt.endTime ||
        (evt.isAllDay ? `${evt.date}T23:59:59` : `${evt.date}T10:00:00`),
      isAllDay: evt.isAllDay,
      rrule: basePropEvent?.rrule || evt.rrule || null,
      exdates: basePropEvent?.exdates || evt.exdates || null,
      occurrenceDate: evt.date,
      colorOverride: evt.color,
    });
    setIsEventModalOpen(true);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-2 sm:p-4 md:p-6 overflow-hidden relative"
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
        initialTime={targetTimeForNewEvent}
        eventToEdit={eventToEdit}
        inhabitants={modalInhabitants}
        accessMode={accessMode}
        familyColor={familyColor}
        familyAvatar={familyAvatar}
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
        familyColor={familyColor}
        familyAvatar={familyAvatar}
        onUpdateFamilyIdentity={onUpdateFamilyIdentity}
        onAddInhabitant={onAddInhabitant || (async () => {})}
        onUpdateInhabitant={onUpdateInhabitant}
        onRemoveInhabitant={onRemoveInhabitant}
      />

      {/* Compact 2-Row Calendar Toolbar */}
      <div
        data-testid="calendar-toolbar"
        className="flex flex-col gap-1.5 sm:gap-2.5 pb-1.5 sm:pb-3 border-b border-cosmos-border shrink-0"
      >
        {/* TOOLBAR ROW 1: Date Navigator & View Switcher (+ Desktop Add Event) */}
        <div
          data-testid="calendar-toolbar-row-1"
          className="flex items-center justify-between gap-1.5 sm:gap-3 min-w-0"
        >
          {/* Left: Date Title & Compact Lateral Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                onClick={prevPeriod}
                className="min-w-[36px] sm:min-w-[44px] min-h-[38px] sm:min-h-[44px] flex items-center justify-center rounded-xl bg-cosmos-surface border border-cosmos-border text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-cardHover transition cursor-pointer"
                title="Previous (or Swipe Left)"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={goToToday}
                className="min-w-0 min-h-[38px] sm:min-h-[44px] px-2 sm:px-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-[11px] sm:text-xs font-bold text-starlight hover:text-cosmos-text hover:bg-cosmos-cardHover transition cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={nextPeriod}
                className="min-w-[36px] sm:min-w-[44px] min-h-[38px] sm:min-h-[44px] flex items-center justify-center rounded-xl bg-cosmos-surface border border-cosmos-border text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-cardHover transition cursor-pointer"
                title="Next (or Swipe Right)"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <h2 className="text-sm sm:text-xl md:text-2xl font-black text-cosmos-text truncate">
              {viewType === "week" ? (
                <>
                  <span className="sm:hidden">
                    {weekDays[0].shortStr} – {weekDays[6].shortStr}
                  </span>
                  <span className="hidden sm:inline">{weekRangeTitle}</span>
                </>
              ) : viewType === "day" ? (
                currentDate.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              ) : (
                <>
                  <span className="sm:hidden">
                    {monthNames[currentMonth].slice(0, 3)} {currentYear}
                  </span>
                  <span className="hidden sm:inline">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                </>
              )}
            </h2>

            <span className="hidden lg:flex text-xs px-2.5 py-1 rounded-lg bg-cosmos-surface text-cosmos-muted font-mono font-bold border border-cosmos-border items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-starlight" />
              {filteredEvents.length} Events
            </span>
          </div>

          {/* Right: View Switcher & Desktop Add Event Button (Critique 4.2: Unified Active Focus) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="flex bg-cosmos-surface p-0.5 sm:p-1 rounded-xl border border-cosmos-border text-[11px] sm:text-xs font-bold">
              {(["month", "week", "day", "schedule"] as const).map((vt) => (
                <button
                  key={vt}
                  onClick={() => setViewType(vt)}
                  className={`min-w-0 min-h-[36px] sm:min-h-[42px] px-2 sm:px-3 py-1 rounded-lg capitalize transition flex items-center justify-center ${
                    viewType === vt
                      ? "theme-focus-pill font-extrabold"
                      : "text-cosmos-muted hover:text-cosmos-text"
                  }`}
                >
                  {vt === "schedule" ? (
                    <>
                      <span className="sm:hidden">List</span>
                      <span className="hidden sm:inline">schedule</span>
                    </>
                  ) : (
                    vt
                  )}
                </button>
              ))}
            </div>

            {accessMode !== "kid" && (
              <button
                onClick={() => handleOpenAddEventOnDate(todayStr)}
                className="hidden sm:flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl theme-focus-pill font-extrabold text-xs transition min-h-[44px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        {/* TOOLBAR ROW 2: Family Member Constellation Filter Strip */}
        <div
          data-testid="calendar-toolbar-row-2"
          className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-none max-w-full"
        >
          {memberList.map((member) => {
            const isSelected = selectedMemberId === member.id;
            const Icon =
              member.id === "all"
                ? getCosmicAvatarIcon(member.avatarIcon)
                : getInhabitantIcon(member.avatarIcon);

            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide transition-all min-h-[38px] sm:min-h-[44px] min-w-0 shrink-0 border ${
                  isSelected
                    ? "bg-cosmos-card text-cosmos-text border-cosmos-borderLight shadow-sm"
                    : "bg-cosmos-surface/75 text-cosmos-muted border-cosmos-border hover:bg-cosmos-cardHover hover:text-cosmos-text"
                }`}
                style={{
                  borderLeftWidth: isSelected ? "4px" : undefined,
                  borderLeftColor: isSelected ? member.color : undefined,
                  background: isSelected
                    ? `linear-gradient(90deg, ${member.color}22 0%, rgb(var(--cosmos-card)) 90%)`
                    : undefined,
                }}
              >
                <div
                  className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0"
                  style={{
                    backgroundColor: member.color,
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
              className="px-2.5 py-1 sm:py-1.5 rounded-xl border border-dashed border-cosmos-border text-cosmos-muted hover:text-starlight hover:border-starlight transition text-[11px] sm:text-xs font-bold flex items-center gap-1 min-h-[38px] sm:min-h-[44px] min-w-0 shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Manage</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Physical Calendar Monthly Grid + Mobile Split Live Agenda */}
      {viewType === "month" && (
        <div className="flex-1 flex flex-col min-h-0 gap-2 sm:gap-0 pt-1.5 sm:pt-2 overflow-hidden">
          {/* Upper Pane (Mobile) / Full Grid (Tablet & Desktop) */}
          <div className="h-[46%] min-h-[200px] max-h-[265px] sm:h-auto sm:max-h-none sm:flex-1 flex flex-col min-h-0 border border-cosmos-border rounded-2xl overflow-hidden bg-cosmos-deep/70 backdrop-blur-md shrink-0 sm:shrink">
            {/* Day of week headers */}
            <div className="grid grid-cols-7 border-b border-cosmos-border bg-cosmos-surface/90 text-center text-[10px] sm:text-xs font-black text-cosmos-muted py-1 sm:py-2.5 tracking-wider">
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
                const dayEvents = filteredEvents
                  .filter((e) => e.date === cell.dateStr)
                  .sort(compareEventsByTime);
                const isSelectedAgendaDay = cell.dateStr === selectedAgendaDate;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedAgendaDate(cell.dateStr);
                      if (typeof window !== "undefined" && window.innerWidth >= 640) {
                        setSelectedDayModal(cell.dateStr);
                      }
                    }}
                    className={`cursor-pointer p-1 sm:p-1.5 flex flex-col justify-start overflow-hidden transition-all select-none relative group ${
                      isSelectedAgendaDay
                        ? "theme-selected-cell"
                        : cell.isCurrentMonth
                        ? "bg-cosmos-deep hover:bg-cosmos-card/80"
                        : "bg-cosmos-void/60 text-cosmos-muted/50 hover:bg-cosmos-deep/50"
                    }`}
                  >
                    {/* Top Bar: Date Number (Critique 4.3: Single-Anchor Keycap/OSL Badge, no double-hat rings) */}
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span
                        className={`text-[11px] sm:text-xs font-black px-1.5 py-0.5 rounded-md ${
                          cell.isToday
                            ? "theme-today-badge font-extrabold"
                            : isSelectedAgendaDay
                            ? "text-starlight font-extrabold"
                            : cell.isCurrentMonth
                            ? "text-cosmos-text group-hover:text-starlight"
                            : "text-cosmos-muted/50"
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

                    {/* Tablet & Desktop: OSL Left-Lip Event Pills */}
                    <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((evt) => {
                        const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                        const bgStyle = getEventBackgroundStyle(colors, "26");

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => handleOpenEditEvent(evt, e)}
                            className="truncate text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md border text-cosmos-text transition hover:brightness-110 flex items-center gap-1"
                            style={{
                              background: bgStyle.background,
                              borderColor: bgStyle.borderColor,
                              borderLeftWidth: "3px",
                              borderLeftColor: bgStyle.primaryColor,
                            }}
                          >
                            {/* Crisp Multi-member micro-pellets */}
                            {colors.length > 1 ? (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {colors.map((c, i) => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-[2px]"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span
                                className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                                style={{ backgroundColor: colors[0] }}
                              />
                            )}

                            <span className="opacity-75 font-mono text-[9px]">
                              {evt.isAllDay ? "ALL DAY" : evt.time.replace(":00", "").toLowerCase()}
                            </span>
                            {evt.rrule && evt.rrule !== "none" && (
                              <Repeat className="w-2.5 h-2.5 inline-block opacity-80 shrink-0" />
                            )}
                            <span className="truncate">{evt.title}</span>
                          </div>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-extrabold text-starlight px-1">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Mobile (<640px): Crisp Micro-Indicators (Critique 4.4: Unblurred horizontal pill bars) */}
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-auto items-center justify-center">
                      {dayEvents.slice(0, 3).map((evt) => {
                        const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                        return colors.length > 1 ? (
                          <div key={evt.id} className="flex items-center gap-[1px] shrink-0">
                            {colors.map((c, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1 rounded-[1.5px]"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div
                            key={evt.id}
                            className="w-2.5 h-1 rounded-[1.5px] shrink-0"
                            style={{ backgroundColor: colors[0] }}
                          />
                        );
                      })}
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

          {/* Lower Pane (Mobile <640px Only): Live Selected-Day Agenda Split View */}
          <div
            data-testid="mobile-month-agenda"
            className="sm:hidden flex-1 flex flex-col min-h-0 border border-cosmos-border rounded-2xl bg-cosmos-deep/85 backdrop-blur-md overflow-hidden"
          >
            {/* Sticky Day Agenda Header */}
            <div className="px-3 py-2 border-b border-cosmos-border bg-cosmos-surface/90 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-cosmos-text truncate">
                  {formatCompactAgendaDate(selectedAgendaDate)}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cosmos-card text-starlight border border-cosmos-border shrink-0">
                  {mobileAgendaEvents.length}{" "}
                  {mobileAgendaEvents.length === 1 ? "Event" : "Events"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = selectedAgendaDate.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                    setViewType("day");
                  }}
                  className="min-w-0 min-h-[34px] px-2.5 py-1 rounded-xl bg-cosmos-card hover:bg-cosmos-cardHover border border-cosmos-border text-[10px] font-bold text-cosmos-text flex items-center gap-1"
                >
                  <Columns className="w-3 h-3 text-starlight" />
                  <span>Day View</span>
                </button>
              </div>
            </div>

            {/* Selected Day Event Cards Stream */}
            <div className="flex-1 overflow-y-auto p-2.5 pb-16 space-y-2">
              {mobileAgendaEvents.length === 0 ? (
                <div className="h-full min-h-[110px] flex flex-col items-center justify-center text-center py-4 px-3 text-cosmos-muted">
                  <CalendarIcon className="w-7 h-7 mb-1.5 opacity-40 text-starlight" />
                  <p className="text-xs font-bold text-cosmos-text">
                    No events scheduled for this date
                  </p>
                  {accessMode !== "kid" && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenAddEventOnDate(selectedAgendaDate, e)}
                      className="mt-2 min-w-0 min-h-[38px] px-3.5 py-1.5 rounded-xl theme-focus-pill text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Event</span>
                    </button>
                  )}
                </div>
              ) : (
                mobileAgendaEvents.map((evt) => {
                  const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                  const bgStyle = getEventBackgroundStyle(colors, "24");
                  const assignedNames =
                    evt.memberIds && evt.memberIds.length > 0
                      ? evt.memberIds
                          .map((id) => memberList.find((m) => m.id === id)?.name || id)
                          .join(", ")
                      : evt.memberId
                      ? memberList.find((m) => m.id === evt.memberId)?.name || "Family"
                      : "🌟 Whole Family";

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => handleOpenEditEvent(evt, e)}
                      className="p-3 rounded-xl border theme-card-nmm flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition shadow-sm"
                      style={{
                        background: bgStyle.background,
                        borderColor: bgStyle.borderColor,
                        borderLeftWidth: "4px",
                        borderLeftColor: bgStyle.primaryColor,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {evt.rrule && evt.rrule !== "none" && (
                            <Repeat className="w-3 h-3 text-starlight shrink-0" />
                          )}
                          <span className="text-xs font-bold text-cosmos-text truncate">
                            {evt.title}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-cosmos-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cosmos-muted shrink-0" />
                            {evt.isAllDay ? "All Day" : `${evt.time} (${evt.duration})`}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                              <MapPin className="w-3 h-3 text-cosmos-muted shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {colors.length > 1 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {colors.map((c, i) => (
                              <span
                                key={i}
                                className="w-2 h-2 rounded-[2px]"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        )}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md font-bold truncate max-w-[95px]"
                          style={{
                            backgroundColor: `${bgStyle.primaryColor}28`,
                            color: bgStyle.primaryColor,
                          }}
                        >
                          {assignedNames}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Single Day Column View */}
      {viewType === "day" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2.5">
          {/* Quick 7-Day Selector Strip (MON - SUN) */}
          <div className="flex items-center justify-between p-1.5 bg-cosmos-surface/90 rounded-2xl border border-cosmos-border gap-1 overflow-x-auto scrollbar-none shrink-0">
            {weekDays.map((day) => {
              const isSelectedDay = day.dateStr === toDateStr(currentDate);
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setCurrentDate(day.date)}
                  className={`flex-1 min-w-0 min-h-[44px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition ${
                    isSelectedDay
                      ? "theme-focus-pill font-black"
                      : day.isToday
                      ? "bg-cosmos-card text-starlight border border-cosmos-borderLight"
                      : "bg-cosmos-card/40 text-cosmos-muted hover:text-cosmos-text"
                  }`}
                  title={`View ${day.dayLabel} (${day.shortStr})`}
                >
                  <span className="text-[9px] font-bold uppercase">{day.dayLabel}</span>
                  <span className="text-xs font-black">{day.date.getDate()}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto space-y-3 pr-2 pb-16 sm:pb-2">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg md:text-xl font-bold text-cosmos-text">
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
            <div className="text-center py-12 text-cosmos-muted">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-starlight" />
              <p className="text-sm font-semibold">No events scheduled for this date.</p>
            </div>
          ) : (
            filteredEvents
              .filter((e) => e.date === toDateStr(currentDate))
              .sort(compareEventsByTime)
              .map((evt) => {
                const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                const bgStyle = getEventBackgroundStyle(colors, "24");
                const assignedNames = (evt.memberIds && evt.memberIds.length > 0)
                  ? evt.memberIds.map((id) => memberList.find((m) => m.id === id)?.name || id).join(", ")
                  : evt.memberId
                  ? memberList.find((m) => m.id === evt.memberId)?.name || "Family"
                  : "🌟 Whole Family";

                return (
                  <div
                    key={evt.id}
                    onClick={(e) => handleOpenEditEvent(evt, e)}
                    className="p-4 rounded-2xl border theme-card-nmm flex items-center justify-between shadow-lg cursor-pointer hover:brightness-105 transition"
                    style={{
                      background: bgStyle.background,
                      borderColor: bgStyle.borderColor,
                      borderLeftWidth: "4px",
                      borderLeftColor: bgStyle.primaryColor,
                    }}
                  >
                    <div>
                      <span className="text-base md:text-lg font-bold text-cosmos-text flex items-center gap-1.5">
                        {evt.rrule && evt.rrule !== "none" && (
                          <Repeat className="w-4 h-4 text-starlight shrink-0" />
                        )}
                        <span>{evt.title}</span>
                      </span>
                      <div className="flex items-center gap-4 mt-1 text-xs text-cosmos-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cosmos-muted" />
                          {evt.isAllDay ? "All Day" : `${evt.time} (${evt.duration})`}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-cosmos-muted" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {evt.agent && (
                        <AgentProvenanceBadge agent={evt.agent} compact />
                      )}
                      {colors.length > 1 && (
                        <div className="flex items-center gap-1">
                          {colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-[3px] shadow-sm"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}
                      <span
                        className="text-xs px-3 py-1 rounded-md font-bold"
                        style={{
                          backgroundColor: `${bgStyle.primaryColor}28`,
                          color: bgStyle.primaryColor,
                        }}
                      >
                        {assignedNames}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
          </div>
        </div>
      )}

      {/* VIEW 3: 7-Day Hour-by-Hour Week Timetable */}
      {viewType === "week" && (
        <div className="flex-1 flex flex-col min-h-0 border border-cosmos-border rounded-2xl overflow-hidden bg-cosmos-deep/80 backdrop-blur-md shadow-2xl mt-1.5 sm:mt-2">
          {/* Mobile Quick Day Selector Strip (Galaxy S24, Galaxy S26+, small mobile screens) */}
          <div className="md:hidden flex items-center justify-between px-2 py-1.5 bg-cosmos-surface/95 border-b border-cosmos-border gap-1 overflow-x-auto scrollbar-none shrink-0">
            {weekDays.map((day, idx) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => scrollToDayColumn(idx)}
                className={`flex-1 min-w-0 min-h-[42px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition ${
                  day.isToday
                    ? "theme-focus-pill font-black"
                    : "bg-cosmos-card/60 text-cosmos-muted hover:text-cosmos-text"
                }`}
                title={`Jump to ${day.dayLabel}`}
              >
                <span className="text-[9px] font-bold uppercase">{day.dayLabel}</span>
                <span className="text-xs font-black">{day.date.getDate()}</span>
              </button>
            ))}
          </div>

          {/* Unified Horizontal Scroll Container (Header + All Day + 24h Grid locked together) */}
          <div
            ref={weekHorizontalScrollRef}
            className="week-grid-scroll-area flex-1 overflow-x-auto overflow-y-hidden flex flex-col min-h-0 scroll-smooth"
          >
            <div className="min-w-[770px] sm:min-w-[840px] md:min-w-0 flex-1 flex flex-col h-full">
              {/* Header Row: Days of Week (Mon - Sun) */}
              <div className="flex border-b border-cosmos-border bg-cosmos-surface/90 shrink-0">
                {/* Time Axis Placeholder / Header */}
                <div className="sticky left-0 z-20 bg-cosmos-surface w-14 sm:w-16 md:w-20 shrink-0 border-r border-cosmos-border py-2 px-1 flex flex-col items-center justify-center text-[10px] text-cosmos-muted font-bold select-none">
                  <Clock className="w-3.5 h-3.5 text-starlight mb-0.5" />
                  <span>TIME</span>
                </div>

                {/* 7 Day Column Headers (MON - SUN) */}
                <div className="flex-1 grid grid-cols-7">
                  {weekDays.map((day) => (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDayModal(day.dateStr)}
                      className={`py-2 px-1 sm:px-2 flex flex-col items-center justify-center border-r border-cosmos-border last:border-r-0 cursor-pointer select-none transition ${
                        day.isToday
                          ? "theme-selected-cell"
                          : "hover:bg-cosmos-cardHover/50 text-cosmos-text"
                      }`}
                      title={`View ${day.shortStr} overview`}
                    >
                      <span
                        className={`text-[10px] sm:text-xs font-black tracking-wider uppercase ${
                          day.isToday ? "text-starlight font-extrabold" : "text-cosmos-muted"
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-md ${
                            day.isToday
                              ? "theme-today-badge font-black"
                              : "text-cosmos-text"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-bold text-starlight uppercase tracking-tight hidden lg:inline">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional All-Day Events Section */}
              {weekDays.some((day) =>
                filteredEvents.some(
                  (e) => e.date === day.dateStr && (e.isAllDay || e.time?.toLowerCase() === "all day")
                )
              ) && (
                <div className="flex border-b border-cosmos-border bg-cosmos-surface/60 shrink-0">
                  <div className="sticky left-0 z-20 bg-cosmos-surface w-14 sm:w-16 md:w-20 shrink-0 border-r border-cosmos-border py-1.5 px-1 flex items-center justify-center text-[9px] text-cosmos-muted font-extrabold tracking-tighter select-none">
                    ALL DAY
                  </div>
                  <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((day) => {
                      const allDayEvents = filteredEvents.filter(
                        (e) => e.date === day.dateStr && (e.isAllDay || e.time?.toLowerCase() === "all day")
                      );
                      return (
                        <div
                          key={day.dateStr}
                          className="p-1 border-r border-cosmos-border last:border-r-0 space-y-1 min-h-[32px] flex flex-col justify-center"
                        >
                          {allDayEvents.map((evt) => {
                            const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                            const bgStyle = getEventBackgroundStyle(colors, "26");

                            return (
                              <div
                                key={evt.id}
                                onClick={(e) => handleOpenEditEvent(evt, e)}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate cursor-pointer transition hover:brightness-110 shadow-sm border flex items-center gap-1 text-cosmos-text"
                                style={{
                                  background: bgStyle.background,
                                  borderColor: bgStyle.borderColor,
                                  borderLeftWidth: "3px",
                                  borderLeftColor: bgStyle.primaryColor,
                                }}
                                title={`${evt.title} (All Day)`}
                              >
                                {colors.length > 1 ? (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {colors.map((c, i) => (
                                      <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-[2px]"
                                        style={{ backgroundColor: c }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                                    style={{ backgroundColor: colors[0] }}
                                  />
                                )}
                                {evt.rrule && evt.rrule !== "none" && (
                                  <Repeat className="w-2.5 h-2.5 shrink-0 opacity-80" />
                                )}
                                <span className="truncate">{evt.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scrollable 24-Hour Grid Container */}
              <div
                ref={weekGridRef}
                className="flex-1 overflow-y-auto relative select-none"
              >
                <div className="flex min-h-[1536px] relative">
              {/* Left Column: 24 Hour Labels */}
              <div className="sticky left-0 z-20 bg-cosmos-deep/95 backdrop-blur-md w-14 sm:w-16 md:w-20 shrink-0 border-r border-cosmos-border/40 select-none">
                {HOURS.map((h) => (
                  <div
                    key={h.hour24}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-cosmos-border/20 pr-1.5 sm:pr-2.5 pt-1 text-right text-[10px] sm:text-xs font-mono font-bold text-cosmos-muted flex flex-col justify-start items-end"
                  >
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>

              {/* 7 Days Hour Columns */}
              <div className="flex-1 grid grid-cols-7 relative">
                {weekDays.map((day) => {
                  const dayEvents = filteredEvents.filter((e) => e.date === day.dateStr);
                  const positionedEvents = layoutDayEvents(dayEvents, HOUR_HEIGHT);

                  // Calculate current time line for today
                  const nowMinutes = todayDate.getHours() * 60 + todayDate.getMinutes();
                  const currentTimeTop = (nowMinutes / 60) * HOUR_HEIGHT;

                  return (
                    <div
                      key={day.dateStr}
                      className={`relative border-r border-cosmos-border/30 last:border-r-0 ${
                        day.isToday ? "bg-cosmos-surface/25" : ""
                      }`}
                    >
                      {/* 24 Hour Clickable Grid Slots */}
                      {HOURS.map((h) => (
                        <div
                          key={h.hour24}
                          onClick={() => handleOpenAddEventOnDate(day.dateStr, h.timeStr)}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-cosmos-border/20 relative group/slot cursor-pointer transition hover:bg-cosmos-surface/40"
                          title={
                            accessMode === "kid"
                              ? `View ${day.shortStr} schedule`
                              : `Schedule event on ${day.dayLabel} at ${h.label}`
                          }
                        >
                          {/* Subtle dashed half-hour divider */}
                          <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-cosmos-border/10 pointer-events-none" />

                          {/* Hover "+" cue for desktop / mouse */}
                          {accessMode !== "kid" && (
                            <div className="absolute right-1 top-1 opacity-0 group-hover/slot:opacity-60 transition text-cosmos-muted hover:text-cosmos-text pointer-events-none">
                              <Plus className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Current Time Indicator on Today's Column */}
                      {day.isToday && (
                        <div
                          style={{ top: `${currentTimeTop}px` }}
                          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-starlight-tension -ml-1" />
                          <div className="flex-1 border-t-2 border-starlight-tension" />
                        </div>
                      )}

                      {/* Positioned Timed Events (OSL Left-Lip Cards with NMM top edge) */}
                      {positionedEvents.map((pos) => {
                        const evt = pos.event;
                        const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                        const bgStyle = getEventBackgroundStyle(colors, "28");
                        const isWholeFamily = (!evt.memberIds || evt.memberIds.length === 0) && !evt.memberId;
                        const FamilyAvatarIcon = getCosmicAvatarIcon(familyAvatar);
                        const InhabitantIcon = isWholeFamily
                          ? FamilyAvatarIcon
                          : getInhabitantIcon(
                              inhabitants.find((i) => i.id === evt.memberId)?.avatarIcon ||
                              SAMPLE_MEMBERS.find((m) => m.id === evt.memberId)?.avatarIcon
                            );

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => handleOpenEditEvent(evt, e)}
                            style={{
                              top: `${pos.top}px`,
                              height: `${pos.height}px`,
                              left: `calc(${pos.colIndex} * (100% / ${pos.totalCols}) + 2px)`,
                              width: `calc(100% / ${pos.totalCols} - 4px)`,
                              background: bgStyle.background,
                              borderColor: bgStyle.borderColor,
                              borderLeftColor: bgStyle.primaryColor,
                              zIndex: 10 + pos.colIndex,
                            }}
                            className="absolute rounded-xl border border-l-4 theme-card-nmm p-1.5 sm:p-2 cursor-pointer shadow-md overflow-hidden transition-all duration-150 hover:scale-[1.01] hover:shadow-xl hover:brightness-105 flex flex-col justify-between backdrop-blur-sm group/evt"
                            title={`${evt.title} (${evt.time}, ${evt.duration})`}
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1 leading-tight">
                                {colors.length > 1 ? (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {colors.map((c, i) => (
                                      <span
                                        key={i}
                                        className="w-2 h-2 rounded-[2px]"
                                        style={{ backgroundColor: c }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className="w-2 h-2 rounded-[2px] shrink-0"
                                    style={{ backgroundColor: colors[0] }}
                                  />
                                )}
                                {evt.rrule && evt.rrule !== "none" && (
                                  <Repeat className="w-2.5 h-2.5 text-starlight shrink-0 opacity-90" />
                                )}
                                <span className="font-black text-[11px] sm:text-xs text-cosmos-text truncate block">
                                  {evt.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-cosmos-muted mt-0.5 opacity-90 font-medium">
                                <Clock className="w-2.5 h-2.5 text-cosmos-muted shrink-0" />
                                <span className="truncate">
                                  {evt.time} ({evt.duration})
                                </span>
                              </div>

                              {/* Location pill if card is tall enough */}
                              {pos.height >= 50 && evt.location && (
                                <div className="flex items-center gap-1 text-[9px] text-cosmos-muted mt-0.5 opacity-80 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-cosmos-muted shrink-0" />
                                  <span className="truncate">{evt.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Inhabitant tag on larger cards */}
                            {pos.height >= 70 && (
                              <div className="flex items-center justify-between mt-auto pt-1 border-t border-cosmos-border/40">
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate flex items-center gap-1"
                                  style={{
                                    backgroundColor: `${bgStyle.primaryColor}28`,
                                    color: bgStyle.primaryColor,
                                  }}
                                >
                                  <InhabitantIcon className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">
                                    {(evt.memberIds && evt.memberIds.length > 0)
                                      ? evt.memberIds.map((id) => memberList.find((m) => m.id === id)?.name || id).join(", ")
                                      : evt.memberId
                                      ? memberList.find((m) => m.id === evt.memberId)?.name || "Family"
                                      : "🌟 Whole Family"}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* VIEW 4: Schedule View */}
      {viewType === "schedule" && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {[...filteredEvents].sort(compareEventsByTime).map((evt) => {
            const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
            const bgStyle = getEventBackgroundStyle(colors, "24");
            const assignedNames = (evt.memberIds && evt.memberIds.length > 0)
              ? evt.memberIds.map((id) => memberList.find((m) => m.id === id)?.name || id).join(", ")
              : evt.memberId
              ? memberList.find((m) => m.id === evt.memberId)?.name || "Family"
              : "🌟 Whole Family";

            return (
              <div
                key={evt.id}
                onClick={(e) => handleOpenEditEvent(evt, e)}
                className="p-4 rounded-2xl border theme-card-nmm flex items-center justify-between cursor-pointer hover:brightness-105 transition shadow-md"
                style={{
                  background: bgStyle.background,
                  borderColor: bgStyle.borderColor,
                  borderLeftWidth: "4px",
                  borderLeftColor: bgStyle.primaryColor,
                }}
              >
                <div className="flex items-center gap-4">
                  {colors.length > 1 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-2.5 h-9 rounded-[3px] shadow-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="w-2.5 h-9 rounded-[3px]"
                      style={{ backgroundColor: colors[0] }}
                    />
                  )}
                  <div>
                    <span className="text-base font-bold text-cosmos-text flex items-center gap-1.5">
                      {evt.rrule && evt.rrule !== "none" && (
                        <Repeat className="w-3.5 h-3.5 text-starlight shrink-0" />
                      )}
                      <span>{evt.title}</span>
                    </span>
                    <span className="text-xs text-cosmos-muted block">
                      {evt.date} • {evt.isAllDay ? "All Day" : `${evt.time} (${evt.duration})`}
                    </span>
                  </div>
                </div>
                <span
                  className="text-xs px-3 py-1 rounded-md font-bold"
                  style={{
                    backgroundColor: `${bgStyle.primaryColor}28`,
                    color: bgStyle.primaryColor,
                  }}
                >
                  {assignedNames}
                </span>
              </div>
            );
          })}
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
                <h3 className="text-lg sm:text-2xl font-black text-cosmos-text">
                  {formatModalHeaderDate(selectedDayModal)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-2 rounded-xl text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Events List for this Day */}
            <div className="my-4 max-h-72 overflow-y-auto space-y-3 pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-cosmos-muted">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-starlight" />
                  <p className="text-sm font-semibold">No events scheduled for this date.</p>
                  <p className="text-xs text-cosmos-muted mt-1">
                    Enjoy family free time or tap Add Event to schedule something!
                  </p>
                </div>
              ) : (
                selectedDateEvents.map((evt) => {
                  const colors = getEventColors(evt, inhabitants, familyColor, activeTheme);
                  const bgStyle = getEventBackgroundStyle(colors, "24");
                  const assignedNames = (evt.memberIds && evt.memberIds.length > 0)
                    ? evt.memberIds.map((id) => memberList.find((m) => m.id === id)?.name || id).join(", ")
                    : evt.memberId
                    ? memberList.find((m) => m.id === evt.memberId)?.name || "Family"
                    : "🌟 Whole Family";

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        setSelectedDayModal(null);
                        handleOpenEditEvent(evt, e);
                      }}
                      className="p-3.5 rounded-2xl border theme-card-nmm flex items-center justify-between cursor-pointer hover:brightness-105 transition shadow-sm"
                      style={{
                        background: bgStyle.background,
                        borderColor: bgStyle.borderColor,
                        borderLeftWidth: "4px",
                        borderLeftColor: bgStyle.primaryColor,
                      }}
                    >
                      <div>
                        <span className="text-sm font-bold text-cosmos-text flex items-center gap-1.5">
                          {evt.rrule && evt.rrule !== "none" && (
                            <Repeat className="w-3 h-3 text-starlight shrink-0" />
                          )}
                          <span>{evt.title}</span>
                        </span>
                        <div className="flex items-center gap-3 text-xs text-cosmos-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cosmos-muted" />
                            {evt.isAllDay ? "All Day" : `${evt.time} (${evt.duration})`}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cosmos-muted" />
                              {evt.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-xs px-2.5 py-1 rounded-md font-bold"
                        style={{
                          backgroundColor: `${bgStyle.primaryColor}28`,
                          color: bgStyle.primaryColor,
                        }}
                      >
                        {assignedNames}
                      </span>
                    </div>
                  );
                })
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
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-cosmos-text transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <Columns className="w-3.5 h-3.5 text-starlight" />
                  <span>View as Day</span>
                </button>
                <button
                  onClick={() => {
                    const [y, m, d] = selectedDayModal.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                    setViewType("week");
                    setSelectedDayModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-cosmos-text transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-starlight-tension" />
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
                  className="px-4 py-2 rounded-xl theme-focus-pill font-bold text-xs transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) for Thumb-Zone Event Creation (<640px) */}
      {accessMode !== "kid" && (
        <button
          type="button"
          data-testid="mobile-add-event-fab"
          onClick={(e) =>
            handleOpenAddEventOnDate(
              viewType === "month"
                ? selectedAgendaDate
                : viewType === "day"
                ? toDateStr(currentDate)
                : todayStr,
              e
            )
          }
          aria-label="Add Event"
          title="Add Event"
          className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-2xl theme-focus-pill shadow-xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
