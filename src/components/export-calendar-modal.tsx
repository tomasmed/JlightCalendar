"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  Calendar,
  Copy,
  Check,
  Globe2,
  Sparkles,
  Users,
  ArrowRight,
  Repeat,
} from "lucide-react";
import { Inhabitant } from "./inhabitants-modal";
import { CalendarEventData } from "./event-modal";
import { filterEventsForTimeWindow } from "@/lib/ics";
import { formatLocalDate } from "@/lib/recurrence";

export interface ExportCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  galaxyId: string;
  galaxyName: string;
  isEphemeral?: boolean;
  inhabitants: Inhabitant[];
  events: CalendarEventData[];
  permanentGalaxies?: { id: string; name: string }[];
  onCopiedToGalaxy?: (targetGalaxyId: string, copiedCount: number) => void;
}

export function ExportCalendarModal({
  isOpen,
  onClose,
  galaxyId,
  galaxyName,
  isEphemeral = false,
  inhabitants,
  events,
  permanentGalaxies = [],
  onCopiedToGalaxy,
}: ExportCalendarModalProps) {
  const [preset, setPreset] = useState<
    "all" | "week" | "month" | "next30" | "custom"
  >("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [recurrenceMode, setRecurrenceMode] = useState<"expanded" | "rrule">(
    "expanded"
  );
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);
  const [targetGalaxyId, setTargetGalaxyId] = useState<string>("");
  const [isCopyingToGalaxy, setIsCopyingToGalaxy] = useState(false);
  const [copyStatusMsg, setCopyStatusMsg] = useState<string | null>(null);

  // Initialize default dates when modal opens or preset changes
  useEffect(() => {
    const now = new Date();
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      setRecurrenceMode("rrule");
    } else if (preset === "week") {
      const day = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      setStartDate(formatLocalDate(start));
      setEndDate(formatLocalDate(end));
      setRecurrenceMode("expanded");
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatLocalDate(start));
      setEndDate(formatLocalDate(end));
      setRecurrenceMode("expanded");
    } else if (preset === "next30") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
      setStartDate(formatLocalDate(start));
      setEndDate(formatLocalDate(end));
      setRecurrenceMode("expanded");
    }
  }, [preset, isOpen]);

  useEffect(() => {
    if (permanentGalaxies.length > 0 && !targetGalaxyId) {
      const other = permanentGalaxies.find((g) => g.id !== galaxyId);
      if (other) {
        setTargetGalaxyId(other.id);
      }
    }
  }, [permanentGalaxies, galaxyId, targetGalaxyId]);

  const previewEvents = useMemo(() => {
    const mapped = events.map((e) => ({
      id: e.id || "evt",
      title: e.title,
      description: e.description,
      location: e.location,
      startTime: e.startTime,
      endTime: e.endTime || e.startTime,
      isAllDay: e.isAllDay,
      rrule: e.rrule,
      exdates: e.exdates,
      memberId: e.memberId,
      memberIds: e.memberIds,
    }));
    return filterEventsForTimeWindow(mapped, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      memberId: selectedMemberId,
      mode: recurrenceMode,
    });
  }, [events, startDate, endDate, selectedMemberId, recurrenceMode]);

  if (!isOpen) return null;

  const buildExportUrl = () => {
    const params = new URLSearchParams();
    params.set("galaxyId", galaxyId);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (selectedMemberId && selectedMemberId !== "all") {
      params.set("memberId", selectedMemberId);
    }
    params.set("mode", recurrenceMode);
    return `/api/events/export?${params.toString()}`;
  };

  const handleDownloadIcs = () => {
    const url = buildExportUrl();
    window.open(url, "_blank");
  };

  const handleCopyFeedUrl = () => {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${buildExportUrl()}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFeedUrl(true);
    setTimeout(() => setCopiedFeedUrl(false), 2500);
  };

  const handleCopyToGalaxy = async () => {
    if (!targetGalaxyId) return;
    setIsCopyingToGalaxy(true);
    setCopyStatusMsg(null);
    try {
      const res = await fetch("/api/comets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy_to_galaxy",
          cometId: galaxyId,
          targetGalaxyId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCopyStatusMsg(
          `Copied ${data.copiedCount} event(s) to your Galaxy!`
        );
        if (onCopiedToGalaxy) {
          onCopiedToGalaxy(targetGalaxyId, data.copiedCount);
        }
      } else {
        setCopyStatusMsg(data.error || "Failed to copy events.");
      }
    } catch {
      setCopyStatusMsg("Network error while copying events.");
    } finally {
      setIsCopyingToGalaxy(false);
    }
  };

  const availableTargetGalaxies = permanentGalaxies.filter(
    (g) => g.id !== galaxyId
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-cosmos-card border border-cosmos-border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-cosmos-border flex items-center justify-between bg-cosmos-surface/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Export & Portability (.ics)
              </h2>
              <p className="text-xs text-slate-400">
                {galaxyName} • Google Calendar, Apple Calendar & Outlook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export modal"
            className="w-12 h-12 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-left">
          {/* 1. Time Window Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              1. Select Time Period (Start Day X → End Day Y)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              {[
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "next30", label: "Next 30d" },
                { id: "all", label: "Full Orbit" },
                { id: "custom", label: "Custom" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreset(opt.id as any)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition min-h-[48px] ${
                    preset === opt.id
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm"
                      : "bg-cosmos-surface border-cosmos-border text-slate-300 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Start Date (Day X)
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setPreset("custom");
                    setStartDate(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-white focus:outline-none focus:border-cyan-400 min-h-[48px]"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                  End Date (Day Y)
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setPreset("custom");
                    setEndDate(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-white focus:outline-none focus:border-cyan-400 min-h-[48px]"
                />
              </div>
            </div>
          </div>

          {/* 2. Participant Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Participant Filter</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-white focus:outline-none focus:border-cyan-400 min-h-[48px]"
            >
              <option value="all">All Participants & Group Events</option>
              {inhabitants.map((inh) => (
                <option key={inh.id} value={inh.id}>
                  Only {inh.displayName} (+ Group Events)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Recurrence Export Mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
              <span>3. Recurring Event Format</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecurrenceMode("expanded")}
                className={`p-3 rounded-xl border text-left transition min-h-[48px] ${
                  recurrenceMode === "expanded"
                    ? "bg-purple-500/20 border-purple-400 text-white"
                    : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs font-bold">Expand Window Slices</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Exports concrete occurrences strictly inside [Day X, Day Y]
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceMode("rrule")}
                className={`p-3 rounded-xl border text-left transition min-h-[48px] ${
                  recurrenceMode === "rrule"
                    ? "bg-purple-500/20 border-purple-400 text-white"
                    : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs font-bold">Preserve RRULE Series</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Keeps RFC 5545 RRULE + EXDATE rules for ongoing sync
                </div>
              </button>
            </div>
          </div>

          {/* Live Preview Banner */}
          <div className="p-3.5 rounded-2xl bg-cosmos-surface/90 border border-cosmos-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">
                Ready to export{" "}
                <span className="text-cyan-300 font-black">
                  {previewEvents.length}
                </span>{" "}
                event{previewEvents.length === 1 ? "" : "s"}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {startDate && endDate
                ? `${startDate} → ${endDate}`
                : "All Dates"}
            </span>
          </div>

          {/* Primary .ics Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition min-h-[48px]"
            >
              <Download className="w-4 h-4" />
              <span>Download .ics File</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFeedUrl}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-slate-200 text-xs font-bold transition min-h-[48px]"
            >
              {copiedFeedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied Feed URL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy .ics Subscription Link</span>
                </>
              )}
            </button>
          </div>

          {/* Optional Bridge: Copy Events to Permanent Galaxy */}
          {availableTargetGalaxies.length > 0 && (
            <div className="pt-3 border-t border-cosmos-border space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  {isEphemeral
                    ? "Bridge: Copy Comet Events to Your Permanent Galaxy"
                    : "Copy Window Events to Another Galaxy"}
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={targetGalaxyId}
                  onChange={(e) => setTargetGalaxyId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-white focus:outline-none min-h-[48px]"
                >
                  {availableTargetGalaxies.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isCopyingToGalaxy || !targetGalaxyId}
                  onClick={handleCopyToGalaxy}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[48px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isCopyingToGalaxy ? "Copying..." : "Copy to Galaxy"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {copyStatusMsg && (
                <p className="text-xs font-bold text-emerald-400">
                  {copyStatusMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
