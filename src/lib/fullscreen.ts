"use client";

import { useState, useEffect, useCallback } from "react";

export interface FullscreenElementLike {
  requestFullscreen?: () => Promise<void> | void;
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export interface FullscreenDocumentLike {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  documentElement?: FullscreenElementLike | null;
  exitFullscreen?: () => Promise<void> | void;
  webkitExitFullscreen?: () => Promise<void> | void;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

function getDefaultDocument(): FullscreenDocumentLike | null {
  if (typeof document === "undefined") {
    return null;
  }
  return document as unknown as FullscreenDocumentLike;
}

/**
 * Returns true if the current browser/document supports entering fullscreen mode.
 */
export function isFullscreenSupported(
  doc: FullscreenDocumentLike | null = getDefaultDocument()
): boolean {
  if (!doc || !doc.documentElement) return false;

  const hasStandardApi =
    typeof doc.documentElement.requestFullscreen === "function" &&
    doc.fullscreenEnabled !== false;

  const hasWebkitApi =
    typeof doc.documentElement.webkitRequestFullscreen === "function" &&
    doc.webkitFullscreenEnabled !== false;

  return hasStandardApi || hasWebkitApi;
}

/**
 * Returns true if the document is currently displaying an element in fullscreen mode.
 */
export function isFullscreenActive(
  doc: FullscreenDocumentLike | null = getDefaultDocument()
): boolean {
  if (!doc) return false;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

/**
 * Requests fullscreen mode on document.documentElement using the standard Fullscreen API
 * with WebKit fallback. Returns true on success, false if unsupported or rejected.
 */
export async function enterFullscreen(
  doc: FullscreenDocumentLike | null = getDefaultDocument()
): Promise<boolean> {
  if (!doc || !doc.documentElement || !isFullscreenSupported(doc)) {
    return false;
  }

  try {
    const el = doc.documentElement;
    if (typeof el.requestFullscreen === "function") {
      await el.requestFullscreen();
      return true;
    }
    if (typeof el.webkitRequestFullscreen === "function") {
      await el.webkitRequestFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error enabling fullscreen: ${message}`);
    return false;
  }
}

/**
 * Exits fullscreen mode if currently active. Returns true on success, false otherwise.
 */
export async function exitFullscreen(
  doc: FullscreenDocumentLike | null = getDefaultDocument()
): Promise<boolean> {
  if (!doc || !isFullscreenActive(doc)) {
    return false;
  }

  try {
    if (typeof doc.exitFullscreen === "function") {
      await doc.exitFullscreen();
      return true;
    }
    if (typeof doc.webkitExitFullscreen === "function") {
      await doc.webkitExitFullscreen();
      return true;
    }
    return false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error exiting fullscreen: ${message}`);
    return false;
  }
}

/**
 * Toggles fullscreen mode: enters fullscreen if inactive, exits if active.
 * Returns true if the requested transition succeeded.
 */
export async function toggleFullscreen(
  doc: FullscreenDocumentLike | null = getDefaultDocument()
): Promise<boolean> {
  if (!doc) return false;
  if (!isFullscreenActive(doc)) {
    return enterFullscreen(doc);
  }
  return exitFullscreen(doc);
}

/**
 * Hydration-safe React hook that tracks browser fullscreen support & state,
 * staying in sync with Escape key / browser chrome exits.
 */
export function useFullscreen() {
  const [isSupported, setIsSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const doc = getDefaultDocument();
    if (!doc) return;

    const syncState = () => {
      setIsSupported(isFullscreenSupported(doc));
      setIsFullscreen(isFullscreenActive(doc));
    };

    syncState();

    doc.addEventListener?.("fullscreenchange", syncState);
    doc.addEventListener?.("webkitfullscreenchange", syncState);

    return () => {
      doc.removeEventListener?.("fullscreenchange", syncState);
      doc.removeEventListener?.("webkitfullscreenchange", syncState);
    };
  }, []);

  const toggle = useCallback(() => {
    void toggleFullscreen();
  }, []);

  return {
    isSupported,
    isFullscreen,
    toggleFullscreen: toggle,
  };
}
