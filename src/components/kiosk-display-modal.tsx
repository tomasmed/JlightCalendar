"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Monitor,
  Sun,
  Moon,
  Image as ImageIcon,
  BatteryCharging,
  Check,
} from "lucide-react";
import {
  KioskDisplaySettings,
  IDLE_PHOTO_MINUTE_OPTIONS,
  formatTimeLabel,
} from "@/lib/kiosk-display";

interface KioskDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: KioskDisplaySettings;
  onSave: (next: KioskDisplaySettings) => void;
  wakeLockSupported: boolean;
  wakeLockActive: boolean;
  isSleeping: boolean;
}

export function KioskDisplayModal({
  isOpen,
  onClose,
  settings,
  onSave,
  wakeLockSupported,
  wakeLockActive,
  isSleeping,
}: KioskDisplayModalProps) {
  const [draft, setDraft] = useState<KioskDisplaySettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-display-modal-title"
    >
      <div
        className="w-full max-w-lg my-auto bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cosmos-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cosmos-surface border border-cosmos-border flex items-center justify-center">
              <Monitor className="w-4 h-4 text-starlight" />
            </div>
            <div>
              <h2
                id="kiosk-display-modal-title"
                className="text-base font-extrabold text-cosmos-text"
              >
                Kiosk Display &amp; Wake Settings
              </h2>
              <p className="text-[11px] text-cosmos-muted">
                Saved locally on this device for wall tablets &amp; kiosks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Kiosk Display Settings"
            className="p-2 rounded-xl text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* 1. Keep Screen Awake (Screen Wake Lock API) */}
          <div className="p-4 rounded-xl bg-cosmos-surface/60 border border-cosmos-border space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sun className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-cosmos-text flex items-center gap-2 flex-wrap">
                    <span>Keep Screen Awake</span>
                    {wakeLockSupported ? (
                      wakeLockActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      ) : isSleeping ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          Paused (Sleeping)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-cosmos-muted border border-cosmos-border">
                          Standby
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Browser Unsupported
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cosmos-muted mt-0.5">
                    Prevents the tablet screen from turning off during daytime hours.
                    Automatically pauses during Night Sleep to save power.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.keepAwakeEnabled}
                aria-label="Toggle Keep Screen Awake"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    keepAwakeEnabled: !prev.keepAwakeEnabled,
                  }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors min-h-[28px] ${
                  draft.keepAwakeEnabled
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-cosmos-card border-cosmos-borderLight"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    draft.keepAwakeEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Daily Wake & Sleep Schedule */}
          <div className="p-4 rounded-xl bg-cosmos-surface/60 border border-cosmos-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Moon className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-cosmos-text">
                    Daily Wake &amp; Sleep Schedule
                  </div>
                  <p className="text-xs text-cosmos-muted mt-0.5">
                    Automatically dims into OLED Night Sleep at bedtime and wakes the
                    calendar every morning.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.scheduleEnabled}
                aria-label="Toggle Daily Wake and Sleep Schedule"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    scheduleEnabled: !prev.scheduleEnabled,
                  }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors min-h-[28px] ${
                  draft.scheduleEnabled
                    ? "bg-indigo-500 border-indigo-400"
                    : "bg-cosmos-card border-cosmos-borderLight"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    draft.scheduleEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {draft.scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cosmos-muted flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    Wake Up
                  </span>
                  <input
                    type="time"
                    value={draft.wakeTime}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        wakeTime: e.target.value || prev.wakeTime,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-cosmos-card border border-cosmos-borderLight text-sm font-mono font-bold text-cosmos-text min-h-[44px]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cosmos-muted flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" />
                    Night Sleep
                  </span>
                  <input
                    type="time"
                    value={draft.sleepTime}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        sleepTime: e.target.value || prev.sleepTime,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-cosmos-card border border-cosmos-borderLight text-sm font-mono font-bold text-cosmos-text min-h-[44px]"
                  />
                </label>

                <p className="col-span-2 text-[11px] text-cosmos-muted">
                  Active display:{" "}
                  <span className="font-bold text-cosmos-text">
                    {formatTimeLabel(draft.wakeTime)}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-cosmos-text">
                    {formatTimeLabel(draft.sleepTime)}
                  </span>
                  . Tap the screen anytime during sleep for a 60s peek.
                </p>
              </div>
            )}
          </div>

          {/* 3. Auto Photo Mode When Idle */}
          <div className="p-4 rounded-xl bg-cosmos-surface/60 border border-cosmos-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ImageIcon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-cosmos-text">
                    Auto Photo Mode When Idle
                  </div>
                  <p className="text-xs text-cosmos-muted mt-0.5">
                    Transitions to your Photo Screensaver after inactivity during awake
                    hours. Tap anywhere to return to the calendar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.idlePhotoEnabled}
                aria-label="Toggle Auto Photo Mode When Idle"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    idlePhotoEnabled: !prev.idlePhotoEnabled,
                  }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors min-h-[28px] ${
                  draft.idlePhotoEnabled
                    ? "bg-cyan-500 border-cyan-400"
                    : "bg-cosmos-card border-cosmos-borderLight"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    draft.idlePhotoEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {draft.idlePhotoEnabled && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cosmos-muted">
                  Idle Timeout
                </span>
                <div className="flex flex-wrap gap-2">
                  {IDLE_PHOTO_MINUTE_OPTIONS.map((mins) => {
                    const selected = draft.idlePhotoMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            idlePhotoMinutes: mins,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[44px] min-w-[54px] ${
                          selected
                            ? "theme-focus-pill border-starlight/60"
                            : "bg-cosmos-card border-cosmos-border text-cosmos-muted hover:text-cosmos-text"
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Wall Tablet & Battery Health Tips */}
          <div className="p-3.5 rounded-xl bg-cosmos-card border border-cosmos-border/80 space-y-1.5 text-xs text-cosmos-muted">
            <div className="flex items-center gap-1.5 font-bold text-cosmos-text">
              <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Wall Tablet Tips</span>
            </div>
            <p>
              <strong className="text-cosmos-text">True Fullscreen PWA:</strong> In
              Chrome on Android, tap <span className="font-mono">⋮ → Install app</span>{" "}
              (or <span className="font-mono">Share → Add to Home Screen</span> in iPad
              Safari) to launch without the address bar.
            </p>
            <p>
              <strong className="text-cosmos-text">Battery Longevity:</strong> Enable
              your tablet&apos;s built-in 80% Battery Protection mode (or a smart plug
              schedule) if mounted on power 24/7.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-cosmos-border/70 bg-cosmos-surface/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface transition min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            <span>Save Display Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
