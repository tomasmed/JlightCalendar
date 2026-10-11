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
  Users,
  Repeat,
} from "lucide-react";
import { Inhabitant, getCosmicAvatarIcon } from "./inhabitants-modal";
import { AccessMode } from "./kiosk-header";
import {
  RecurrenceFrequency,
  RECURRENCE_OPTIONS,
  rruleToFrequency,
  frequencyToRrule,
  computeEventTimes,
  computeDurationMinutes,
  formatLocalDate,
} from "@/lib/recurrence";

export interface CalendarEventData {
  id?: string;
  galaxyId: string;
  calendarId?: string;
  memberId?: string | null;
  memberIds?: string[] | string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  endTime: string;
  isAllDay?: boolean;
  rrule?: string | null;
  exdates?: string[] | string | null;
  occurrenceDate?: string; // Specific occurrence date clicked (YYYY-MM-DD)
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
  familyColor?: string;
  familyAvatar?: string;
  onSaveEvent: (event: CalendarEventData) => Promise<void>;
  onDeleteEvent?: (id: string, exdate?: string) => Promise<void>;
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
  familyColor = "#ef4444",
  familyAvatar = "planet",
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [color, setColor] = useState(familyColor);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);

  useEffect(() => {
    setShowDeleteChoice(false);
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
        setDate(selectedDate || formatLocalDate(new Date()));
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

      // Parse multi-members or fallback to single memberId
      let initialMemberIds: string[] = [];
      if (eventToEdit.memberIds) {
        try {
          const parsed = typeof eventToEdit.memberIds === "string" 
            ? JSON.parse(eventToEdit.memberIds) 
            : eventToEdit.memberIds;
          if (Array.isArray(parsed)) {
            initialMemberIds = parsed;
          }
        } catch (e) {
          if (typeof eventToEdit.memberIds === "string") {
            initialMemberIds = [eventToEdit.memberIds];
          }
        }
      } else if (eventToEdit.memberId) {
        initialMemberIds = [eventToEdit.memberId];
      }
      setSelectedMemberIds(initialMemberIds);

      setColor(eventToEdit.colorOverride || (initialMemberIds.length === 1 ? inhabitants.find(i => i.id === initialMemberIds[0])?.color || familyColor : familyColor));
    } else {
      setTitle("");
      setDate(selectedDate || formatLocalDate(new Date()));
      setTime(initialTime || "09:00");
      setDurationMinutes(60);
      setIsAllDay(false);
      setRecurrenceFreq("none");
      setLocation("");
      setDescription("");
      setSelectedMemberIds([]);
      setColor(familyColor);
    }
  }, [eventToEdit, selectedDate, initialTime, isOpen, familyColor]);

  if (!isOpen) return null;

  const isReadOnly = accessMode === "kid";
  const canDelete = !isReadOnly && accessMode === "admin" && Boolean(eventToEdit?.id);

  // Toggle member chip
  const handleToggleMember = (mId: string) => {
    let next: string[];
    if (selectedMemberIds.includes(mId)) {
      next = selectedMemberIds.filter((id) => id !== mId);
    } else {
      next = [...selectedMemberIds, mId];
    }
    setSelectedMemberIds(next);

    // If 1 member selected and no custom color override was set, sync color to that member's color
    if (next.length === 1) {
      const inh = inhabitants.find((i) => i.id === next[0]);
      if (inh) setColor(inh.color);
    } else if (next.length === 0) {
      setColor(familyColor);
    }
  };

  const handleSelectWholeFamily = () => {
    setSelectedMemberIds([]);
    setColor(familyColor);
  };

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
        memberId: selectedMemberIds.length === 1 ? selectedMemberIds[0] : null,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : null,
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
    const isRecurring = Boolean(eventToEdit.rrule && eventToEdit.rrule !== "none");
    if (isRecurring) {
      setShowDeleteChoice(true);
      return;
    }

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

  const handleConfirmDeleteSingleOccurrence = async () => {
    if (!eventToEdit?.id || !onDeleteEvent) return;
    const targetDate = eventToEdit.occurrenceDate || date;
    setIsSubmitting(true);
    try {
      await onDeleteEvent(eventToEdit.id, targetDate);
      setShowDeleteChoice(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteWholeSeries = async () => {
    if (!eventToEdit?.id || !onDeleteEvent) return;
    setIsSubmitting(true);
    try {
      await onDeleteEvent(eventToEdit.id);
      setShowDeleteChoice(false);
      onClose();
    } finally {
      setIsSubmitting(false);
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

          {/* Assigned Inhabitants (Multi-Select Chips + Whole Family) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Assigned Inhabitants
              </label>
              <span className="text-[10px] text-slate-400">
                {selectedMemberIds.length === 0
                  ? "🌟 Whole Family event"
                  : selectedMemberIds.length === 1
                  ? "Single crew assignment"
                  : `Shared event (${selectedMemberIds.length} members)`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Whole Family Chip */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={handleSelectWholeFamily}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition min-h-[44px] cursor-pointer ${
                  selectedMemberIds.length === 0
                    ? "bg-red-500/20 text-white border-red-500 ring-2 ring-red-400/40 shadow-md"
                    : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white hover:bg-cosmos-cardHover"
                }`}
              >
                {React.createElement(getCosmicAvatarIcon(familyAvatar), {
                  className: "w-3.5 h-3.5",
                  style: { color: familyColor },
                })}
                <span>Whole Family</span>
              </button>

              {/* Individual Member Chips */}
              {inhabitants.map((inh) => {
                const isSelected = selectedMemberIds.includes(inh.id);
                return (
                  <button
                    key={inh.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleToggleMember(inh.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition min-h-[44px] cursor-pointer ${
                      isSelected
                        ? "text-white shadow-md ring-2"
                        : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white hover:bg-cosmos-cardHover"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${inh.color}25`,
                            borderColor: inh.color,
                            boxShadow: `0 0 10px ${inh.color}30`,
                          }
                        : {}
                    }
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: inh.color }}
                    />
                    <span>{inh.displayName}</span>
                    {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>
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

      {/* Recurring Event Deletion Choice Dialog */}
      {showDeleteChoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-cosmos-card border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Delete Recurring Event</h3>
                <p className="text-xs text-slate-400">This event repeats on the calendar.</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Would you like to delete only this occurrence on{" "}
              <strong className="text-white font-mono">{eventToEdit?.occurrenceDate || date}</strong>,
              or remove the entire recurring series?
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteSingleOccurrence}
                className="w-full py-3 px-4 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-starlight text-sm font-bold transition flex items-center justify-between min-h-[48px]"
              >
                <span>Just this one</span>
                <span className="text-xs text-slate-400 font-normal">Delete single date</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteWholeSeries}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition flex items-center justify-between min-h-[48px] shadow-lg shadow-rose-600/30"
              >
                <span>The whole series</span>
                <span className="text-xs text-rose-200 font-normal">Delete all dates</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteChoice(false)}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
