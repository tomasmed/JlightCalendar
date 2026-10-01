"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Trash2,
  Check,
  User,
  Repeat,
} from "lucide-react";
import { Inhabitant } from "./inhabitants-modal";
import { AccessMode } from "./kiosk-header";
import {
  RecurrenceFrequency,
  RECURRENCE_OPTIONS,
  rruleToFrequency,
  frequencyToRrule,
  computeEventTimes,
  computeDurationMinutes,
} from "@/lib/recurrence";

export interface CalendarEventData {
  id?: string;
  galaxyId: string;
  calendarId?: string;
  memberId?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  endTime: string;
  isAllDay?: boolean;
  rrule?: string | null;
  colorOverride?: string | null;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEventData | null;
  selectedDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:mm
  activeGalaxyId: string;
  inhabitants: Inhabitant[];
  accessMode: AccessMode;
  onSaveEvent: (event: CalendarEventData) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
}

const COLOR_PRESETS = [
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ffd166", // Yellow / Gold
  "#ef4444", // Red
];

export function EventModal({
  isOpen,
  onClose,
  eventToEdit,
  selectedDate,
  initialTime,
  activeGalaxyId,
  inhabitants,
  accessMode,
  onSaveEvent,
  onDeleteEvent,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState<string>("all");
  const [color, setColor] = useState(COLOR_PRESETS[1]);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      const allDay = Boolean(eventToEdit.isAllDay);
      setIsAllDay(allDay);
      setRecurrenceFreq(rruleToFrequency(eventToEdit.rrule));
      const start = new Date(eventToEdit.startTime);
      if (!isNaN(start.getTime())) {
        setDate(eventToEdit.startTime.split("T")[0]);
        setTime(
          eventToEdit.startTime.split("T")[1]?.slice(0, 5) || "09:00"
        );
      } else {
        setDate(selectedDate || new Date().toISOString().split("T")[0]);
        setTime("09:00");
      }

      if (eventToEdit.startTime && eventToEdit.endTime) {
        const diffMins = computeDurationMinutes(
          eventToEdit.startTime,
          eventToEdit.endTime,
          60
        );
        setDurationMinutes(diffMins);
      } else {
        setDurationMinutes(60);
      }

      setLocation(eventToEdit.location || "");
      setDescription(eventToEdit.description || "");
      setMemberId(eventToEdit.memberId || "all");
      setColor(eventToEdit.colorOverride || COLOR_PRESETS[1]);
    } else {
      setTitle("");
      setDate(selectedDate || new Date().toISOString().split("T")[0]);
      setTime(initialTime || "09:00");
      setDurationMinutes(60);
      setIsAllDay(false);
      setRecurrenceFreq("none");
      setLocation("");
      setDescription("");
      setMemberId("all");
      setColor(COLOR_PRESETS[1]);
    }
  }, [eventToEdit, selectedDate, initialTime, isOpen]);

  if (!isOpen) return null;

  const isReadOnly = accessMode === "kid";
  const canDelete = !isReadOnly && accessMode === "admin" && Boolean(eventToEdit?.id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !title.trim() || !date) return;

    setIsSubmitting(true);
    try {
      const { startTimeISO, endTimeISO } = computeEventTimes(
        date,
        time,
        durationMinutes,
        isAllDay
      );

      await onSaveEvent({
        id: eventToEdit?.id,
        galaxyId: activeGalaxyId,
        memberId: memberId === "all" ? null : memberId,
        title: title.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        startTime: startTimeISO,
        endTime: endTimeISO,
        isAllDay,
        rrule: frequencyToRrule(recurrenceFreq),
        colorOverride: color,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !eventToEdit?.id || !onDeleteEvent) return;
    if (confirm("Are you sure you want to remove this event from the galaxy orbit?")) {
      setIsSubmitting(true);
      try {
        await onDeleteEvent(eventToEdit.id);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmos-void/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cosmos-border flex items-center justify-between bg-cosmos-deep/60">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl border flex items-center justify-center text-white"
              style={{ backgroundColor: `${color}30`, borderColor: color }}
            >
              <Calendar className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                {isReadOnly
                  ? "Event Details"
                  : eventToEdit?.id
                  ? "Modify Orbital Event"
                  : "Schedule New Event"}
              </h2>
              <p className="text-xs text-slate-400">
                {isReadOnly
                  ? "Viewing scheduled family activity"
                  : "Assign to inhabitants and choose orbital colors"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-white border border-cosmos-border transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              placeholder="e.g. Java Vet Appointment 🐾, Soccer Match, Taco Night"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
              required
            />
          </div>

          {/* All-Day Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-cosmos-surface border border-cosmos-border">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-5 h-5 rounded-md accent-purple-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-white">All-Day Event</span>
            </label>
            {isAllDay && (
              <span className="text-[11px] font-extrabold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                Spans Full Day
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Date
              </label>
              <input
                type="date"
                disabled={isReadOnly}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
                required
              />
            </div>

            {!isAllDay ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    disabled={isReadOnly}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Duration
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hr</option>
                    <option value={90}>1.5 hrs</option>
                    <option value={120}>2 hrs</option>
                    <option value={180}>3 hrs</option>
                    <option value={240}>4 hrs</option>
                    <option value={300}>5 hrs</option>
                    <option value={360}>6 hrs</option>
                    <option value={480}>8 hrs</option>
                    <option value={600}>10 hrs</option>
                    <option value={720}>12 hrs</option>
                    <option value={1440}>24 hrs</option>
                    {![15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720, 1440].includes(durationMinutes) && (
                      <option value={durationMinutes}>{durationMinutes} min</option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-end">
                <div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold flex items-center min-h-[48px]">
                  <span>🕒 All day event (00:00 to 23:59)</span>
                </div>
              </div>
            )}
          </div>

          {/* Recurrence Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
              <span>Repeat / Recurrence</span>
            </label>
            <select
              disabled={isReadOnly}
              value={recurrenceFreq}
              onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
              className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Inhabitant (Crew Member / Pet) */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Assigned Inhabitant / Companion
            </label>
            <select
              disabled={isReadOnly}
              value={memberId}
              onChange={(e) => {
                const selected = e.target.value;
                setMemberId(selected);
                if (selected !== "all") {
                  const found = inhabitants.find((i) => i.id === selected);
                  if (found) setColor(found.color);
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
            >
              <option value="all">🌟 All Galaxy / Whole Family</option>
              {inhabitants.map((inhabitant) => (
                <option key={inhabitant.id} value={inhabitant.id}>
                  {inhabitant.displayName} ({inhabitant.role})
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                disabled={isReadOnly}
                placeholder="e.g. Healthy Paws Vet, Lincoln Elementary, Home"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
              />
            </div>
          </div>

          {/* Color Tag */}
          {!isReadOnly && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Orbital Badge Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setColor(preset)}
                    style={{ backgroundColor: preset }}
                    className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl border-2 transition min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      color === preset
                        ? "border-white scale-110 shadow-lg"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-cosmos-border">
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider transition min-h-[48px] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-300 text-sm font-bold border border-cosmos-border transition min-h-[48px] flex items-center justify-center"
              >
                Cancel
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-500/30 transition disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save Event"}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
