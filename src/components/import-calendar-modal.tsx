"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Upload,
  Calendar,
  Check,
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  Repeat,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Inhabitant } from "./inhabitants-modal";
import { parseIcsCalendar, ParsedIcsCalendar } from "@/lib/ics";
import { getRecurrenceLabel } from "@/lib/recurrence";

export interface ImportCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  galaxyId: string;
  galaxyName: string;
  inhabitants: Inhabitant[];
  onImportComplete?: () => void;
}

export function ImportCalendarModal({
  isOpen,
  onClose,
  galaxyId,
  galaxyName,
  inhabitants,
  onImportComplete,
}: ImportCalendarModalProps) {
  // All React hooks declared unconditionally at top
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [icsText, setIcsText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCalendar, setParsedCalendar] = useState<ParsedIcsCalendar | null>(
    null
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [deduplicate, setDeduplicate] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    calendarName?: string | null;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab("file");
      setIcsText("");
      setFileName(null);
      setParsedCalendar(null);
      setParseError(null);
      setSelectedMemberId("all");
      setDeduplicate(true);
      setIsImporting(false);
      setImportResult(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleParseContent = (rawText: string, sourceName?: string) => {
    setParseError(null);
    setImportResult(null);
    if (!rawText.trim()) {
      setParsedCalendar(null);
      return;
    }
    try {
      const parsed = parseIcsCalendar(rawText);
      if (!parsed.events || parsed.events.length === 0) {
        setParseError(
          "No events found in this .ics file. Please ensure it contains valid VEVENT records."
        );
        setParsedCalendar(null);
        return;
      }
      setParsedCalendar(parsed);
      if (sourceName) {
        setFileName(sourceName);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse .ics file";
      setParseError(msg);
      setParsedCalendar(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setIcsText(content);
      handleParseContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setIcsText(content);
      handleParseContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handlePasteChange = (val: string) => {
    setIcsText(val);
    if (val.includes("BEGIN:VCALENDAR")) {
      handleParseContent(val, "Pasted iCalendar Content");
    } else {
      setParsedCalendar(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedCalendar || !icsText) return;
    setIsImporting(true);
    setParseError(null);

    try {
      const res = await fetch("/api/events/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galaxyId,
          icsText,
          memberId: selectedMemberId === "all" ? null : selectedMemberId,
          deduplicate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import events");
      }

      setImportResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        calendarName: data.calendarName || parsedCalendar.calendarName,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing import";
      setParseError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Safe early return after all hooks
  if (!isOpen) return null;

  const eventCount = parsedCalendar?.events?.length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-cosmos-surface border border-cosmos-border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cosmos-border shrink-0 bg-cosmos-surface/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="import-modal-title"
                className="text-base sm:text-lg font-bold text-cosmos-text leading-tight"
              >
                Import .ics Calendar
              </h2>
              <p className="text-xs text-cosmos-muted">
                Import events into{" "}
                <span className="text-emerald-400 font-semibold">
                  {galaxyName}
                </span>{" "}
                from Google, Apple, or Outlook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import calendar modal"
            className="p-2.5 rounded-xl text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-card transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {importResult ? (
            /* Success State */
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-cosmos-text">
                  Import Successful!
                </h3>
                <p className="text-sm text-cosmos-muted max-w-md">
                  Successfully added{" "}
                  <span className="text-emerald-400 font-bold">
                    {importResult.importedCount}
                  </span>{" "}
                  event{importResult.importedCount === 1 ? "" : "s"} to{" "}
                  <span className="text-cosmos-text font-medium">
                    {galaxyName}
                  </span>
                  .
                  {importResult.skippedCount > 0 && (
                    <span className="block mt-1 text-xs text-amber-400/90">
                      ({importResult.skippedCount} duplicate event
                      {importResult.skippedCount === 1 ? "" : "s"} skipped)
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    setImportResult(null);
                    setParsedCalendar(null);
                    setIcsText("");
                    setFileName(null);
                  }}
                  className="px-4 py-3 rounded-xl border border-cosmos-border bg-cosmos-card hover:bg-cosmos-cardHover text-sm font-semibold text-cosmos-text transition min-h-[48px]"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-black transition min-h-[48px] shadow-lg shadow-emerald-500/20"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Upload / Configuration State */
            <>
              {/* Method Switcher Tabs */}
              <div className="flex rounded-xl bg-cosmos-canvas/60 p-1 border border-cosmos-border shrink-0">
                <button
                  type="button"
                  onClick={() => setTab("file")}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[44px] ${
                    tab === "file"
                      ? "bg-cosmos-card text-emerald-400 shadow-sm border border-emerald-500/20"
                      : "text-cosmos-muted hover:text-cosmos-text"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload .ics File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("paste")}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition min-h-[44px] ${
                    tab === "paste"
                      ? "bg-cosmos-card text-emerald-400 shadow-sm border border-emerald-500/20"
                      : "text-cosmos-muted hover:text-cosmos-text"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Paste .ics Text</span>
                </button>
              </div>

              {/* Tab 1: File Upload / Drag & Drop */}
              {tab === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Upload .ics calendar file"
                  />

                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? "border-emerald-400 bg-emerald-500/10 scale-[0.99]"
                        : "border-cosmos-border hover:border-emerald-500/40 bg-cosmos-canvas/40 hover:bg-cosmos-card/40"
                    }`}
                  >
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cosmos-text">
                        {fileName ? (
                          <span className="text-emerald-400">{fileName}</span>
                        ) : (
                          "Click to browse or drag & drop .ics file"
                        )}
                      </p>
                      <p className="text-xs text-cosmos-muted mt-1">
                        Exported from Google Calendar, Apple Calendar, or Outlook
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-1 px-4 py-2 rounded-xl text-xs font-bold bg-cosmos-card hover:bg-cosmos-cardHover border border-cosmos-border text-cosmos-text transition min-h-[44px] flex items-center justify-center"
                    >
                      Select File
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Paste Raw Text */}
              {tab === "paste" && (
                <div className="space-y-2">
                  <label
                    htmlFor="ics-paste-area"
                    className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider"
                  >
                    Raw iCalendar Content (.ics)
                  </label>
                  <textarea
                    id="ics-paste-area"
                    value={icsText}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;PRODID:-//Example//EN&#10;BEGIN:VEVENT&#10;SUMMARY:Soccer Practice&#10;..."
                    className="w-full h-36 p-3.5 rounded-xl bg-cosmos-canvas border border-cosmos-border text-xs font-mono text-cosmos-text focus:outline-none focus:border-emerald-400 transition"
                  />
                  {icsText && !parsedCalendar && (
                    <button
                      type="button"
                      onClick={() =>
                        handleParseContent(icsText, "Pasted Content")
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition min-h-[44px]"
                    >
                      Parse Calendar
                    </button>
                  )}
                </div>
              )}

              {/* Parse Error Notification */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Preview & Options Section */}
              {parsedCalendar && eventCount > 0 && (
                <div className="space-y-4 pt-2 border-t border-cosmos-border">
                  {/* Summary Bar */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs sm:text-sm font-bold text-cosmos-text">
                        Ready to import {eventCount} event
                        {eventCount === 1 ? "" : "s"}
                        {parsedCalendar.calendarName
                          ? ` from "${parsedCalendar.calendarName}"`
                          : ""}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      RFC 5545 Verified
                    </span>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Attribution / Inhabitant assignment */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="import-member-select"
                        className="block text-xs font-semibold text-cosmos-muted flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Assign to Family Member</span>
                      </label>
                      <select
                        id="import-member-select"
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-cosmos-canvas border border-cosmos-border text-xs sm:text-sm text-cosmos-text focus:outline-none focus:border-emerald-400 transition min-h-[48px]"
                      >
                        <option value="all">
                          Whole Family / Shared (No single owner)
                        </option>
                        {inhabitants.map((inh) => (
                          <option key={inh.id} value={inh.id}>
                            {inh.displayName} ({inh.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Deduplication Toggle */}
                    <div className="flex items-end">
                      <label
                        htmlFor="import-dedup-checkbox"
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-cosmos-canvas border border-cosmos-border cursor-pointer hover:bg-cosmos-card/40 transition min-h-[48px]"
                      >
                        <input
                          id="import-dedup-checkbox"
                          type="checkbox"
                          checked={deduplicate}
                          onChange={(e) => setDeduplicate(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-cosmos-border bg-cosmos-surface"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-cosmos-text block">
                            Skip duplicates
                          </span>
                          <span className="text-cosmos-muted block text-[11px]">
                            Omit events that already exist
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Event Preview List */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-cosmos-muted uppercase tracking-wider block">
                      Events Preview ({Math.min(eventCount, 5)} of {eventCount})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-cosmos-canvas/40 p-2 border border-cosmos-border">
                      {parsedCalendar.events.slice(0, 5).map((evt, idx) => (
                        <div
                          key={`${evt.externalUid}-${idx}`}
                          className="p-2.5 rounded-lg bg-cosmos-card border border-cosmos-border/60 text-xs flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cosmos-text truncate max-w-[70%]">
                              {evt.title}
                            </span>
                            {evt.rrule && (
                              <span className="text-[10px] flex items-center gap-1 text-cyan-400 font-medium">
                                <Repeat className="w-3 h-3" />
                                {getRecurrenceLabel(evt.rrule)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cosmos-muted text-[11px]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              {evt.isAllDay
                                ? `${evt.startTime.slice(0, 10)} (All Day)`
                                : `${evt.startTime.replace("T", " ")}`}
                            </span>
                            {evt.location && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <MapPin className="w-3 h-3 text-amber-400" />
                                {evt.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {eventCount > 5 && (
                        <div className="text-center py-1 text-[11px] text-cosmos-muted font-medium">
                          +{eventCount - 5} more events in this calendar
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div className="px-5 py-4 border-t border-cosmos-border bg-cosmos-surface/80 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-cosmos-border bg-cosmos-card hover:bg-cosmos-cardHover text-xs sm:text-sm font-semibold text-cosmos-text transition min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedCalendar || eventCount === 0 || isImporting}
              onClick={handleExecuteImport}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[48px] shadow-lg ${
                parsedCalendar && eventCount > 0 && !isImporting
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                  : "bg-cosmos-card border border-cosmos-border text-cosmos-muted cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    Import {eventCount > 0 ? `${eventCount} Events` : "Events"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
