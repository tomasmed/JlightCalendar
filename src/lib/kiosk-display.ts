"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const KIOSK_DISPLAY_STORAGE_KEY = "jlight_kiosk_display_settings";
export const IDLE_PHOTO_MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;
export const MANUAL_WAKE_GRACE_MS = 60_000; // ADR 0003: 60s wake grace during sleep window

export interface KioskDisplaySettings {
  /** Keep tablet screen awake during daytime hours via Screen Wake Lock API */
  keepAwakeEnabled: boolean;
  /** Automatically transition between Night Sleep and daytime display */
  scheduleEnabled: boolean;
  /** Local wall-clock time (HH:mm) to exit Night Sleep */
  wakeTime: string;
  /** Local wall-clock time (HH:mm) to enter Night Sleep */
  sleepTime: string;
  /** Automatically switch to Photo Mode when idle during awake hours */
  idlePhotoEnabled: boolean;
  /** Minutes of inactivity before entering Photo Mode */
  idlePhotoMinutes: number;
}

export const DEFAULT_KIOSK_DISPLAY_SETTINGS: KioskDisplaySettings = {
  keepAwakeEnabled: true,
  scheduleEnabled: false,
  wakeTime: "07:00",
  sleepTime: "22:30",
  idlePhotoEnabled: false,
  idlePhotoMinutes: 15,
};

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

export interface WakeLockNavigatorLike {
  wakeLock?: {
    request?: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Parses an "HH:mm" 24-hour local time string into minutes since midnight (0..1439).
 * Returns null if the string is invalid.
 */
export function parseTimeToMinutes(hhmm: string): number | null {
  if (typeof hhmm !== "string") return null;
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Formats an "HH:mm" string into a friendly 12-hour display string (e.g. "7:00 AM").
 */
export function formatTimeLabel(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  if (mins === null) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * Returns true if `nowMinutes` (0..1439) falls inside the [sleepTime, wakeTime) window.
 * Supports both overnight windows (e.g. 22:30 -> 07:00) and daytime windows (e.g. 13:00 -> 15:00).
 * Returns false if either time is invalid or if sleepTime === wakeTime.
 */
export function isWithinSleepWindow(
  nowMinutes: number,
  sleepTime: string,
  wakeTime: string
): boolean {
  const sleepMins = parseTimeToMinutes(sleepTime);
  const wakeMins = parseTimeToMinutes(wakeTime);
  if (sleepMins === null || wakeMins === null) return false;
  if (sleepMins === wakeMins) return false;

  const normalizedNow = ((Math.floor(nowMinutes) % 1440) + 1440) % 1440;

  if (sleepMins > wakeMins) {
    // Overnight window wrapping past midnight (e.g. 22:30 -> 07:00)
    return normalizedNow >= sleepMins || normalizedNow < wakeMins;
  }
  // Same-day window (e.g. 13:00 -> 15:00)
  return normalizedNow >= sleepMins && normalizedNow < wakeMins;
}

/**
 * Returns true when the Screen Wake Lock should be actively held.
 * Releases automatically during Night Sleep so the tablet can conserve power/backlight.
 */
export function shouldHoldWakeLock(
  settings: Pick<KioskDisplaySettings, "keepAwakeEnabled">,
  isSleeping: boolean
): boolean {
  return Boolean(settings.keepAwakeEnabled) && !isSleeping;
}

/**
 * Sanitizes and merges partial/untrusted settings with defaults.
 */
export function normalizeKioskDisplaySettings(
  raw: Partial<KioskDisplaySettings> | null | undefined
): KioskDisplaySettings {
  const base = { ...DEFAULT_KIOSK_DISPLAY_SETTINGS };
  if (!raw || typeof raw !== "object") return base;

  if (typeof raw.keepAwakeEnabled === "boolean") {
    base.keepAwakeEnabled = raw.keepAwakeEnabled;
  }
  if (typeof raw.scheduleEnabled === "boolean") {
    base.scheduleEnabled = raw.scheduleEnabled;
  }
  if (typeof raw.wakeTime === "string" && parseTimeToMinutes(raw.wakeTime) !== null) {
    base.wakeTime = raw.wakeTime.trim();
  }
  if (typeof raw.sleepTime === "string" && parseTimeToMinutes(raw.sleepTime) !== null) {
    base.sleepTime = raw.sleepTime.trim();
  }
  if (typeof raw.idlePhotoEnabled === "boolean") {
    base.idlePhotoEnabled = raw.idlePhotoEnabled;
  }
  if (
    typeof raw.idlePhotoMinutes === "number" &&
    Number.isFinite(raw.idlePhotoMinutes)
  ) {
    const clamped = Math.max(1, Math.min(240, Math.round(raw.idlePhotoMinutes)));
    base.idlePhotoMinutes = clamped;
  }

  return base;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadKioskDisplaySettings(
  storage: StorageLike | null = getDefaultStorage()
): KioskDisplaySettings {
  if (!storage) return { ...DEFAULT_KIOSK_DISPLAY_SETTINGS };
  try {
    const raw = storage.getItem(KIOSK_DISPLAY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KIOSK_DISPLAY_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<KioskDisplaySettings>;
    return normalizeKioskDisplaySettings(parsed);
  } catch {
    return { ...DEFAULT_KIOSK_DISPLAY_SETTINGS };
  }
}

export function saveKioskDisplaySettings(
  settings: KioskDisplaySettings,
  storage: StorageLike | null = getDefaultStorage()
): KioskDisplaySettings {
  const normalized = normalizeKioskDisplaySettings(settings);
  if (!storage) return normalized;
  try {
    storage.setItem(KIOSK_DISPLAY_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore quota/private-mode storage failures
  }
  return normalized;
}

function getDefaultNavigator(): WakeLockNavigatorLike | null {
  if (typeof navigator === "undefined") return null;
  return navigator as unknown as WakeLockNavigatorLike;
}

/**
 * Returns true if the current browser supports the W3C Screen Wake Lock API.
 */
export function isWakeLockSupported(
  nav: WakeLockNavigatorLike | null = getDefaultNavigator()
): boolean {
  return Boolean(nav?.wakeLock && typeof nav.wakeLock.request === "function");
}

/**
 * React hook that manages a Screen Wake Lock sentinel while `enabled` is true.
 * Automatically re-acquires the lock when returning to a visible tab (per W3C spec)
 * and releases it when disabled or on unmount.
 */
export function useWakeLock(enabled: boolean) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const nav = getDefaultNavigator();
    const supported = isWakeLockSupported(nav);
    setIsSupported(supported);

    if (!supported || !enabled) {
      const existing = sentinelRef.current;
      sentinelRef.current = null;
      setIsActive(false);
      if (existing && !existing.released) {
        void existing.release().catch(() => {});
      }
      return;
    }

    let cancelled = false;

    const handleRelease = () => {
      if (!cancelled) {
        setIsActive(false);
      }
    };

    const acquire = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const sentinel = await nav?.wakeLock?.request?.("screen");
        if (!sentinel) return;
        if (cancelled) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.("release", handleRelease);
        setIsActive(true);
      } catch {
        // Wake lock request can be rejected if battery saver is active or tab isn't visible
        if (!cancelled) {
          setIsActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };

    void acquire();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      const existing = sentinelRef.current;
      sentinelRef.current = null;
      if (existing) {
        existing.removeEventListener?.("release", handleRelease);
        if (!existing.released) {
          void existing.release().catch(() => {});
        }
      }
      setIsActive(false);
    };
  }, [enabled]);

  return {
    isSupported,
    isActive,
  };
}

interface UseKioskDisplayControllerOptions {
  isSleeping: boolean;
  setIsSleeping: (next: boolean) => void;
  activeTab: string;
  onEnterPhotoMode: () => void;
  onEnterScheduledSleep?: () => void;
  disabled?: boolean;
}

/**
 * Coordinates Kiosk Display Settings (localStorage), Screen Wake Lock,
 * automated Wake/Sleep scheduling, and Idle-to-Photo-Mode transitions.
 */
export function useKioskDisplayController({
  isSleeping,
  setIsSleeping,
  activeTab,
  onEnterPhotoMode,
  onEnterScheduledSleep,
  disabled = false,
}: UseKioskDisplayControllerOptions) {
  const [settings, setSettings] = useState<KioskDisplaySettings>(
    DEFAULT_KIOSK_DISPLAY_SETTINGS
  );
  const [hydrated, setHydrated] = useState(false);

  // Track manual wake timestamp so tapping during night sleep grants a 60s grace window
  const manualWakeUntilRef = useRef<number>(0);
  // Track previous schedule window state so we only auto-wake on exit or auto-sleep on entry
  const wasInSleepWindowRef = useRef<boolean | null>(null);

  useEffect(() => {
    setSettings(loadKioskDisplaySettings());
    setHydrated(true);
  }, []);

  const updateSettings = useCallback((next: KioskDisplaySettings) => {
    const saved = saveKioskDisplaySettings(next);
    setSettings(saved);
    // Reset schedule transition memory when user updates schedule
    wasInSleepWindowRef.current = null;
  }, []);

  const notifyManualWake = useCallback(() => {
    manualWakeUntilRef.current = Date.now() + MANUAL_WAKE_GRACE_MS;
    setIsSleeping(false);
  }, [setIsSleeping]);

  // 1. Screen Wake Lock (active during daytime hours, released during Night Sleep)
  const wakeLockDesired =
    hydrated && !disabled && shouldHoldWakeLock(settings, isSleeping);
  const wakeLock = useWakeLock(wakeLockDesired);

  // 2. Daily Wake & Sleep Schedule Evaluator
  useEffect(() => {
    if (!hydrated || disabled || !settings.scheduleEnabled) {
      wasInSleepWindowRef.current = null;
      return;
    }

    const evaluateSchedule = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const inWindow = isWithinSleepWindow(
        nowMinutes,
        settings.sleepTime,
        settings.wakeTime
      );
      const prevInWindow = wasInSleepWindowRef.current;
      wasInSleepWindowRef.current = inWindow;

      if (inWindow) {
        if (!isSleeping && Date.now() >= manualWakeUntilRef.current) {
          setIsSleeping(true);
          onEnterScheduledSleep?.();
        }
      } else if (prevInWindow === true && isSleeping) {
        // Scheduled wake-up time reached!
        setIsSleeping(false);
      }
    };

    evaluateSchedule();
    const interval = setInterval(evaluateSchedule, 30_000);
    return () => clearInterval(interval);
  }, [
    hydrated,
    disabled,
    settings.scheduleEnabled,
    settings.sleepTime,
    settings.wakeTime,
    isSleeping,
    setIsSleeping,
    onEnterScheduledSleep,
  ]);

  // 3. Idle-to-Photo-Mode Timer (only while awake and not already in Photo Mode)
  useEffect(() => {
    if (
      !hydrated ||
      disabled ||
      !settings.idlePhotoEnabled ||
      isSleeping ||
      activeTab === "photos"
    ) {
      return;
    }

    const timeoutMs = settings.idlePhotoMinutes * 60_000;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        onEnterPhotoMode();
      }, timeoutMs);
    };

    resetTimer();

    const activityEvents = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    for (const evt of activityEvents) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }

    return () => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      for (const evt of activityEvents) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [
    hydrated,
    disabled,
    settings.idlePhotoEnabled,
    settings.idlePhotoMinutes,
    isSleeping,
    activeTab,
    onEnterPhotoMode,
  ]);

  return {
    settings,
    updateSettings,
    notifyManualWake,
    wakeLockSupported: wakeLock.isSupported,
    wakeLockActive: wakeLock.isActive,
  };
}
