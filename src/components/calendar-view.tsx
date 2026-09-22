"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Filter,
} from "lucide-react";
import { AccessMode } from "./kiosk-header";

interface Member {
  id: string;
  name: string;
  color: string;
}

const SAMPLE_MEMBERS: Member[] = [
  { id: "m1", name: "All Family", color: "#3b82f6" },
  { id: "m2", name: "Mom", color: "#ec4899" },
  { id: "m3", name: "Dad", color: "#10b981" },
  { id: "m4", name: "Leo (Kid)", color: "#8b5cf6" },
  { id: "m5", name: "Mia (Kid)", color: "#f59e0b" },
];

interface CalendarEvent {
  id: string;
  memberId: string;
  title: string;
  time: string;
  duration: string;
  location?: string;
  color: string;
}

const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    memberId: "m4",
    title: "Leo Soccer Practice",
    time: "4:30 PM",
    duration: "1 hr",
    location: "Community Field 2",
    color: "#8b5cf6",
  },
  {
    id: "e2",
    memberId: "m2",
    title: "Parent-Teacher Conference",
    time: "2:00 PM",
    duration: "30 min",
    location: "Lincoln Elementary",
    color: "#ec4899",
  },
  {
    id: "e3",
    memberId: "m1",
    title: "Family Taco Night",
    time: "6:30 PM",
    duration: "1 hr",
    location: "Home",
    color: "#3b82f6",
  },
  {
    id: "e4",
    memberId: "m5",
    title: "Mia Gymnastics",
    time: "5:15 PM",
    duration: "45 min",
    location: "YMCA Gym A",
    color: "#f59e0b",
  },
  {
    id: "e5",
    memberId: "m3",
    title: "Dentist Cleaning",
    time: "10:00 AM",
    duration: "1 hr",
    location: "Downtown Dental",
    color: "#10b981",
  },
];

interface CalendarViewProps {
  accessMode: AccessMode;
}

export function CalendarView({ accessMode }: CalendarViewProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("m1");
  const [viewType, setViewType] = useState<"day" | "week" | "month" | "schedule">("day");

  const filteredEvents =
    selectedMemberId === "m1"
      ? SAMPLE_EVENTS
      : SAMPLE_EVENTS.filter((e) => e.memberId === selectedMemberId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-hidden">
      {/* Top Controls: Family Members Filter & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        {/* Family Member Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SAMPLE_MEMBERS.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${
                  isSelected
                    ? "bg-slate-800 text-white border-2 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
                }`}
                style={{
                  borderColor: isSelected ? member.color : undefined,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span>{member.name}</span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Add Event */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {(["day", "week", "month", "schedule"] as const).map((vt) => (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  viewType === vt
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {vt}
              </button>
            ))}
          </div>

          {/* Add Event (Disabled in Kid mode) */}
          {accessMode !== "kid" && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white shadow-lg shadow-blue-500/20 transition">
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Header / Navigator */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-white">Today, Monday Sep 21</h2>
          <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
            5 Events
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white">
            Today
          </button>
          <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Events Timeline / Member Column View */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between"
            style={{ borderLeftWidth: "6px", borderLeftColor: evt.color }}
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-white font-bold text-lg">
                  <span>{evt.title}</span>
                </div>
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
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-xs px-3 py-1 rounded-full font-bold text-white/90"
                style={{ backgroundColor: `${evt.color}33`, color: evt.color }}
              >
                {SAMPLE_MEMBERS.find((m) => m.id === evt.memberId)?.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
