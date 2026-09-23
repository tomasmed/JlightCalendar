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
} from "lucide-react";
import { Inhabitant } from "./inhabitants-modal";
import { AccessMode } from "./kiosk-header";

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
  colorOverride?: string | null;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEventData | null;
  selectedDate?: string; // YYYY-MM-DD
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
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState<string>("all");
  const [color, setColor] = useState(COLOR_PRESETS[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
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
      setLocation(eventToEdit.location || "");
      setDescription(eventToEdit.description || "");
      setMemberId(eventToEdit.memberId || "all");
      setColor(eventToEdit.colorOverride || COLOR_PRESETS[1]);
    } else {
      setTitle("");
      setDate(selectedDate || new Date().toISOString().split("T")[0]);
      setTime("09:00");
      setDurationMinutes(60);
      setLocation("");
      setDescription("");
      setMemberId("all");
      setColor(COLOR_PRESETS[1]);
    }
  }, [eventToEdit, selectedDate, isOpen]);

  if (!isOpen) return null;

  const isReadOnly = accessMode === "kid";
  const canDelete = !isReadOnly && accessMode === "admin" && Boolean(eventToEdit?.id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !title.trim() || !date) return;

    setIsSubmitting(true);
    try {
      const startTimeISO = `${date}T${time}:00`;
      const startDt = new Date(startTimeISO);
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000);
      const endTimeISO = endDt.toISOString().replace("Z", "");

      await onSaveEvent({
        id: eventToEdit?.id,
        galaxyId: activeGalaxyId,
        memberId: memberId === "all" ? null : memberId,
        title: title.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        startTime: startTimeISO,
        endTime: endTimeISO,
        isAllDay: false,
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
              <div className="w-28">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Duration
                </label>
                <select
                  disabled={isReadOnly}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hr</option>
                  <option value={90}>1.5 hr</option>
                  <option value={120}>2 hrs</option>
                </select>
              </div>
            </div>
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
                    className={`w-9 h-9 rounded-xl border-2 transition min-w-[36px] min-h-[36px] ${
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
          <div className="pt-4 flex items-center justify-between border-t border-cosmos-border">
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider transition min-h-[48px] flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-300 text-sm font-bold border border-cosmos-border transition min-h-[48px]"
              >
                Cancel
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-500/30 transition disabled:opacity-50 min-h-[48px] flex items-center gap-2"
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
