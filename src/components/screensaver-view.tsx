"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CloudSun,
  Calendar as CalendarIcon,
  ArrowLeft,
  Settings2,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  HelpCircle,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { AccessMode } from "@/components/kiosk-header";
import type { CalendarEventData } from "@/components/event-modal";
import { useActiveTheme } from "@/lib/theme";
import {
  ScreensaverConfig,
  ResolvedPhotoItem,
  PhotoProvider,
  DEFAULT_SCREENSAVER_CONFIG,
  CURATED_SAMPLE_PHOTOS,
  parseScreensaverConfig,
} from "@/lib/photos";

interface ScreensaverViewProps {
  onDismiss: () => void;
  activeGalaxyId?: string;
  activeGalaxyName?: string;
  accessMode?: AccessMode;
  events?: CalendarEventData[];
}

const PLAYLIST_CACHE_PREFIX = "jlight-screensaver-playlist-v1:";
const BROWSER_IMAGE_CACHE = "jlight-screensaver-images-v1";
const PLAYLIST_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours between upstream metadata refreshes

interface CachedPlaylistPayload {
  syncedAt: number;
  config: ScreensaverConfig;
  photos: ResolvedPhotoItem[];
  source: PhotoProvider;
  warning?: string;
}

export function ScreensaverView({
  onDismiss,
  activeGalaxyId = "galaxy_sol_family",
  activeGalaxyName,
  accessMode = "admin",
  events = [],
}: ScreensaverViewProps) {
  // All React hooks declared unconditionally at the top
  const activeTheme = useActiveTheme();

  // 1. Playback & Clock State
  const [config, setConfig] = useState<ScreensaverConfig>(DEFAULT_SCREENSAVER_CONFIG);
  const [photos, setPhotos] = useState<ResolvedPhotoItem[]>(CURATED_SAMPLE_PHOTOS);
  const [activeSource, setActiveSource] = useState<PhotoProvider>("sample");
  const [syncWarning, setSyncWarning] = useState<string | undefined>(undefined);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [previousPhotoIndex, setPreviousPhotoIndex] = useState<number | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Track detected portrait orientation by photo ID (from metadata or naturalHeight > naturalWidth)
  const [portraitMap, setPortraitMap] = useState<Record<string, boolean>>({});
  // Track locally cached blob URLs for proxied/same-origin images
  const [cachedBlobUrls, setCachedBlobUrls] = useState<Record<string, string>>({});
  const [warmedCount, setWarmedCount] = useState(0);

  // Clock & Burn-in Pixel Shift State (ADR 0003: +-2px every 10 minutes)
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [pixelOffset, setPixelOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Settings Modal & Form State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(true);
  const [draftConfig, setDraftConfig] = useState<ScreensaverConfig>(DEFAULT_SCREENSAVER_CONFIG);
  const [clearImmichKey, setClearImmichKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const blobUrlRegistryRef = useRef<string[]>([]);

  // Cleanup any created object URLs on unmount
  useEffect(() => {
    return () => {
      for (const objUrl of blobUrlRegistryRef.current) {
        try {
          URL.revokeObjectURL(objUrl);
        } catch {
          // Ignore revoke errors
        }
      }
    };
  }, []);

  // Compute real next upcoming family event from Galaxy events
  const nextUpcomingEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const now = new Date();
    const upcoming = events
      .map((ev) => {
        const start = new Date(ev.startTime);
        return { ev, start };
      })
      .filter(({ start }) => !isNaN(start.getTime()) && start.getTime() >= now.getTime() - 30 * 60 * 1000)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (upcoming.length === 0) return null;
    const { ev, start } = upcoming[0];
    const isToday = start.toDateString() === now.toDateString();
    const dayPrefix = isToday
      ? "Today"
      : start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const timeLabel = ev.isAllDay
      ? `${dayPrefix} • All Day`
      : `${dayPrefix} • ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

    return {
      title: ev.title,
      location: ev.location,
      timeLabel,
    };
  }, [events]);

  // Warm images into Browser CacheStorage (for proxy URLs) & browser HTTP cache (for Google CDN / Unsplash)
  const warmPhotoCache = useCallback(
    async (items: ResolvedPhotoItem[], maxCount: number) => {
      if (typeof window === "undefined") return;
      const capped = items.slice(0, maxCount);
      let warmed = 0;
      const newBlobMap: Record<string, string> = {};

      const hasCacheStorage = "caches" in window;
      let cache: Cache | null = null;
      if (hasCacheStorage) {
        try {
          cache = await window.caches.open(BROWSER_IMAGE_CACHE);
          // Prune old cache entries beyond the current capped playlist
          const activeUrls = new Set(
            capped
              .filter((p) => p.url.startsWith("/"))
              .map((p) => new URL(p.url, window.location.origin).toString())
          );
          const keys = await cache.keys();
          for (const req of keys) {
            if (!activeUrls.has(req.url)) {
              await cache.delete(req);
            }
          }
        } catch {
          cache = null;
        }
      }

      for (const item of capped) {
        try {
          if (item.url.startsWith("/") && cache) {
            const fullUrl = new URL(item.url, window.location.origin).toString();
            let cachedRes = await cache.match(fullUrl);
            if (!cachedRes) {
              const netRes = await fetch(fullUrl);
              if (netRes.ok) {
                await cache.put(fullUrl, netRes.clone());
                cachedRes = netRes;
              }
            }
            if (cachedRes) {
              const blob = await cachedRes.blob();
              const objUrl = URL.createObjectURL(blob);
              blobUrlRegistryRef.current.push(objUrl);
              newBlobMap[item.id] = objUrl;
              warmed++;
              continue;
            }
          }

          // Cross-origin CDN URLs (Google Photos lh3.googleusercontent.com =w1920-h1080 or sample):
          // Preload via Image() so browser disk cache stores the 1080p asset locally
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              if (img.naturalHeight > 0 && img.naturalWidth > 0) {
                const isPort = img.naturalHeight > img.naturalWidth;
                setPortraitMap((prev) =>
                  prev[item.id] === isPort ? prev : { ...prev, [item.id]: isPort }
                );
              }
              warmed++;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = item.url;
          });
        } catch {
          // Ignore single photo warmup error
        }
      }

      if (Object.keys(newBlobMap).length > 0) {
        setCachedBlobUrls((prev) => ({ ...prev, ...newBlobMap }));
      }
      setWarmedCount(warmed);
    },
    []
  );

  // Load playlist from local browser cache first, or fetch from /api/photos
  const loadScreensaverFeed = useCallback(
    async (forceNetwork = false) => {
      const targetGalaxyId = activeGalaxyId || "galaxy_sol_family";
      const storageKey = `${PLAYLIST_CACHE_PREFIX}${targetGalaxyId}`;

      if (!forceNetwork && typeof window !== "undefined") {
        try {
          const rawCached = window.localStorage.getItem(storageKey);
          if (rawCached) {
            const parsed: CachedPlaylistPayload = JSON.parse(rawCached);
            const isFresh = Date.now() - (parsed.syncedAt || 0) < PLAYLIST_TTL_MS;
            if (isFresh && Array.isArray(parsed.photos) && parsed.photos.length > 0) {
              const safeCfg = parseScreensaverConfig(parsed.config);
              setConfig(safeCfg);
              setDraftConfig(safeCfg);
              setPhotos(parsed.photos);
              setActiveSource(parsed.source || safeCfg.provider);
              setSyncWarning(parsed.warning);
              setPhotoIndex(0);
              warmPhotoCache(parsed.photos, safeCfg.maxCachedPhotos);
              return;
            }
          }
        } catch {
          // Fall through to network fetch
        }
      }

      setIsSyncing(true);
      try {
        const res = await fetch(
          `/api/photos?galaxyId=${encodeURIComponent(targetGalaxyId)}`
        );
        if (res.ok) {
          const data = await res.json();
          const safeCfg = parseScreensaverConfig(data.config);
          const list: ResolvedPhotoItem[] =
            Array.isArray(data.photos) && data.photos.length > 0
              ? data.photos
              : CURATED_SAMPLE_PHOTOS;

          setConfig(safeCfg);
          setDraftConfig(safeCfg);
          setPhotos(list);
          setActiveSource(data.source || safeCfg.provider);
          setSyncWarning(data.warning);
          setPhotoIndex(0);

          if (typeof window !== "undefined") {
            const payload: CachedPlaylistPayload = {
              syncedAt: Date.now(),
              config: safeCfg,
              photos: list,
              source: data.source || safeCfg.provider,
              warning: data.warning,
            };
            window.localStorage.setItem(storageKey, JSON.stringify(payload));
          }

          warmPhotoCache(list, safeCfg.maxCachedPhotos);
        }
      } catch (err) {
        console.error("Failed to fetch screensaver feed:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    [activeGalaxyId, warmPhotoCache]
  );

  useEffect(() => {
    loadScreensaverFeed(false);
  }, [loadScreensaverFeed]);

  // Live Clock & Burn-in Pixel Shift Timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      setDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // ADR 0003: Shift HUD coordinates by +-2px every 10 minutes to prevent OLED/LCD pixel retention
    const pixelInterval = setInterval(() => {
      const offsets = [-2, -1, 0, 1, 2];
      const nextX = offsets[Math.floor(Math.random() * offsets.length)];
      const nextY = offsets[Math.floor(Math.random() * offsets.length)];
      setPixelOffset({ x: nextX, y: nextY });
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(pixelInterval);
    };
  }, []);

  // Trigger smooth crossfade to a target slide index
  const transitionToIndex = useCallback(
    (nextIdx: number) => {
      if (photos.length <= 1) return;
      setPhotoIndex((curr) => {
        setPreviousPhotoIndex(curr);
        setIsCrossfading(true);
        return ((nextIdx % photos.length) + photos.length) % photos.length;
      });
    },
    [photos.length]
  );

  // Clear previous slide layer after the gentle crossfade finishes
  useEffect(() => {
    if (!isCrossfading) return;
    const timer = setTimeout(() => {
      setIsCrossfading(false);
      setPreviousPhotoIndex(null);
    }, config.transitionDurationMs);
    return () => clearTimeout(timer);
  }, [isCrossfading, config.transitionDurationMs]);

  // Automatic Slideshow Rotation Timer
  useEffect(() => {
    if (isPaused || isSettingsOpen || photos.length <= 1) return;
    const intervalMs = Math.max(8, config.slideIntervalSeconds) * 1000;
    const rotationTimer = setInterval(() => {
      transitionToIndex(photoIndex + 1);
    }, intervalMs);

    return () => clearInterval(rotationTimer);
  }, [
    isPaused,
    isSettingsOpen,
    photos.length,
    config.slideIntervalSeconds,
    photoIndex,
    transitionToIndex,
  ]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusBanner(null);

    const targetGalaxyId = activeGalaxyId || "galaxy_sol_family";
    const storageKey = `${PLAYLIST_CACHE_PREFIX}${targetGalaxyId}`;

    try {
      const res = await fetch("/api/photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galaxyId: targetGalaxyId,
          config: {
            ...draftConfig,
            clearImmichApiKey: clearImmichKey,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({
          type: "error",
          message: data.error || "Could not save your photo settings. Please check your link and try again.",
        });
        return;
      }

      const safeCfg = parseScreensaverConfig(data.config);
      const list: ResolvedPhotoItem[] =
        Array.isArray(data.photos) && data.photos.length > 0
          ? data.photos
          : CURATED_SAMPLE_PHOTOS;

      setConfig(safeCfg);
      setDraftConfig(safeCfg);
      setClearImmichKey(false);
      setPhotos(list);
      setActiveSource(data.source || safeCfg.provider);
      setSyncWarning(data.warning);
      setPhotoIndex(0);

      if (typeof window !== "undefined") {
        const payload: CachedPlaylistPayload = {
          syncedAt: Date.now(),
          config: safeCfg,
          photos: list,
          source: data.source || safeCfg.provider,
          warning: data.warning,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      }

      warmPhotoCache(list, safeCfg.maxCachedPhotos);

      if (data.warning) {
        setStatusBanner({
          type: "warning",
          message: `We saved your settings, but couldn't load that album yet: ${data.warning}`,
        });
      } else {
        setStatusBanner({
          type: "success",
          message: `All set! Loaded ${list.length} photos for your family photo frame.`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        message: err?.message || "Could not connect right now. Please try again in a moment.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshAlbumPhotos = async () => {
    const targetGalaxyId = activeGalaxyId || "galaxy_sol_family";
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${PLAYLIST_CACHE_PREFIX}${targetGalaxyId}`);
      if ("caches" in window) {
        try {
          await window.caches.delete(BROWSER_IMAGE_CACHE);
        } catch {
          // Ignore cache delete error
        }
      }
    }
    setCachedBlobUrls({});
    setWarmedCount(0);
    await loadScreensaverFeed(true);
    setStatusBanner({
      type: "success",
      message: "Refreshed your album and checked for new photos!",
    });
  };

  const currentPhoto = photos[photoIndex] || CURATED_SAMPLE_PHOTOS[0];
  const previousPhoto =
    previousPhotoIndex !== null ? photos[previousPhotoIndex] : null;

  const isPhotoPortrait = (item: ResolvedPhotoItem | null): boolean => {
    if (!item) return false;
    if (portraitMap[item.id] !== undefined) return portraitMap[item.id];
    if (item.isPortrait !== undefined) return item.isPortrait;
    if (item.width && item.height) return item.height > item.width;
    return false;
  };

  const resolveDisplayUrl = (item: ResolvedPhotoItem): string => {
    return cachedBlobUrls[item.id] || item.url;
  };

  const renderPhotoSlide = (
    item: ResolvedPhotoItem,
    isEntering: boolean,
    keyPrefix: string
  ) => {
    const src = resolveDisplayUrl(item);
    const useBlurredPortraitFill =
      config.portraitFillMode === "blur" && isPhotoPortrait(item);
    const brightnessFilter = `brightness(${
      Math.max(40, Math.min(100, config.brightnessPercent)) / 100
    })`;

    return (
      <div
        key={`${keyPrefix}-${item.id}`}
        style={{
          transitionDuration: `${config.transitionDurationMs}ms`,
          filter: brightnessFilter,
        }}
        className={`absolute inset-0 transition-opacity ease-in-out ${
          isEntering ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      >
        {useBlurredPortraitFill ? (
          <>
            {/* Ambient Blurred Backdrop Fill for Portrait Photos */}
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-65 select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-black/25" />
            {/* Uncropped Centered Portrait Image */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-4 md:p-8">
              <img
                src={src}
                alt={item.caption || "Family memory"}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalHeight > 0 && img.naturalWidth > 0) {
                    const isPort = img.naturalHeight > img.naturalWidth;
                    setPortraitMap((prev) =>
                      prev[item.id] === isPort
                        ? prev
                        : { ...prev, [item.id]: isPort }
                    );
                  }
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none pointer-events-none"
              />
            </div>
          </>
        ) : (
          /* Full-Bleed Landscape / Cover Presentation with Gentle Drift */
          <img
            src={src}
            alt={item.caption || "Family memory"}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalHeight > 0 && img.naturalWidth > 0) {
                const isPort = img.naturalHeight > img.naturalWidth;
                setPortraitMap((prev) =>
                  prev[item.id] === isPort ? prev : { ...prev, [item.id]: isPort }
                );
              }
            }}
            className="w-full h-full object-cover scale-[1.02] transition-transform duration-[15000ms] ease-out select-none pointer-events-none"
          />
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onDismiss}
      data-active-theme={activeTheme}
      className="relative flex-1 w-full h-full overflow-hidden bg-black cursor-pointer select-none"
    >
      {/* Double-Buffered Gentle Crossfade Slides */}
      {previousPhoto &&
        isCrossfading &&
        renderPhotoSlide(previousPhoto, false, "prev")}
      {renderPhotoSlide(currentPhoto, true, "curr")}

      {/* Soft, Gentle Vignette Overlay (No harsh dimming pulse) */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-transparent to-black/35 pointer-events-none" />

      {/* Top HUD Bar: Wake Button + Playback Controls + Choose Album Button */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-30 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[48px] px-4 py-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-slate-100 text-xs sm:text-sm font-semibold border border-white/15 flex items-center gap-2 transition shadow-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Calendar</span>
        </button>

        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          {/* Slide Navigation & Pause Controls */}
          {photos.length > 1 && (
            <div className="hidden sm:flex items-center bg-black/45 backdrop-blur-md border border-white/15 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => transitionToIndex(photoIndex - 1)}
                title="Previous photo"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                title={isPaused ? "Resume slideshow" : "Pause slideshow"}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => transitionToIndex(photoIndex + 1)}
                title="Next photo"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin / Standard Mode: Photo Album & Display Settings Button */}
          {accessMode !== "kid" && (
            <button
              type="button"
              onClick={() => {
                setDraftConfig(config);
                setStatusBanner(null);
                setIsSettingsOpen(true);
              }}
              className="min-h-[48px] px-4 py-2 rounded-full bg-cosmos-card/90 hover:bg-cosmos-cardHover backdrop-blur-md text-cosmos-text text-xs sm:text-sm font-bold border border-cosmos-border flex items-center gap-2 transition shadow-lg cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-starlight" />
              <span>Photo Album & Display</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Ambient HUD Overlay (with ADR 0003 Burn-in Pixel Shifting) */}
      <div
        style={{
          transform: `translate(${pixelOffset.x}px, ${pixelOffset.y}px)`,
        }}
        className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 z-30 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-none transition-transform duration-1000"
      >
        <div className="flex flex-col">
          {config.showClock && (
            <>
              <span className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight drop-shadow-lg tabular-nums">
                {time}
              </span>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-slate-200 drop-shadow-md">
                {date}
              </span>
            </>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-200/85 font-medium">
            <ImageIcon className="w-3.5 h-3.5 text-starlight" />
            <span>
              {config.albumName ||
                (activeSource === "google_photos"
                  ? "Family Google Photos Album"
                  : activeSource === "immich"
                  ? "Family Immich Album"
                  : "Sample Nature Photos")}
            </span>
            <span>•</span>
            <span>
              Photo {photoIndex + 1} of {photos.length}
            </span>
            {currentPhoto?.caption && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate max-w-xs">
                  {currentPhoto.caption}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Weather Widget */}
          {config.showWeather && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-white w-fit">
              <CloudSun className="w-6 h-6 text-amber-400" />
              <div>
                <span className="text-lg font-bold">72°F</span>
                <span className="text-xs text-slate-300 ml-2">Mostly Sunny</span>
              </div>
            </div>
          )}

          {/* Live Next Upcoming Family Event */}
          {config.showNextEvent && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-white max-w-md">
              <CalendarIcon className="w-5 h-5 text-starlight shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-starlight uppercase tracking-wider block">
                  {nextUpcomingEvent
                    ? `Coming Up • ${nextUpcomingEvent.timeLabel}`
                    : "Family Schedule"}
                </span>
                <span className="text-sm font-bold truncate block">
                  {nextUpcomingEvent
                    ? `${nextUpcomingEvent.title}${
                        nextUpcomingEvent.location
                          ? ` (${nextUpcomingEvent.location})`
                          : ""
                      }`
                    : `No upcoming plans on ${
                        activeGalaxyName || "your calendar"
                      }`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Themed Family Photo Frame Settings Modal */}
      {isSettingsOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsSettingsOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-default animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl my-auto max-h-[92dvh] overflow-hidden rounded-3xl bg-cosmos-card border border-cosmos-border text-cosmos-text shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-cosmos-border bg-cosmos-surface/60 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-starlight/15 border border-starlight/30 flex items-center justify-center text-starlight shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-cosmos-text">
                    Family Photo Frame
                  </h2>
                  <p className="text-xs sm:text-sm text-cosmos-muted">
                    Choose an album of favorite memories to display when your calendar is resting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close photo frame settings"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-cosmos-muted hover:text-cosmos-text transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSaveSettings}
              className="p-5 sm:p-7 overflow-y-auto space-y-5 text-left"
            >
              {/* 1. Source Provider Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-2">
                  1. Where are your family photos?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: "google_photos",
                        title: "Google Photos",
                        subtitle: "Paste a shared album link",
                      },
                      {
                        id: "immich",
                        title: "Immich",
                        subtitle: "Your home photo album",
                      },
                      {
                        id: "sample",
                        title: "Sample Nature",
                        subtitle: "Relaxing landscapes",
                      },
                    ] as const
                  ).map((option) => {
                    const selected = draftConfig.provider === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            provider: option.id,
                          }))
                        }
                        className={`min-h-[56px] p-3.5 rounded-2xl border text-left transition flex flex-col justify-center cursor-pointer ${
                          selected
                            ? "bg-starlight/15 border-starlight text-cosmos-text shadow-sm"
                            : "bg-cosmos-surface/70 border-cosmos-border text-cosmos-muted hover:bg-cosmos-cardHover hover:text-cosmos-text"
                        }`}
                      >
                        <span className="text-sm font-bold text-cosmos-text">
                          {option.title}
                        </span>
                        <span className="text-[11px] text-cosmos-muted">
                          {option.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Album Title Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-1.5">
                  Album Title (Shown in the corner of your screen)
                </label>
                <input
                  type="text"
                  value={draftConfig.albumName}
                  onChange={(e) =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      albumName: e.target.value,
                    }))
                  }
                  placeholder="e.g., Summer Vacation or Our Family"
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text placeholder:text-cosmos-muted/60 focus:outline-none focus:border-starlight transition"
                />
              </div>

              {/* Google Photos Shared Album Walkthrough */}
              {draftConfig.provider === "google_photos" && (
                <div className="space-y-3 rounded-2xl bg-cosmos-deep/70 border border-cosmos-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-starlight">
                      Google Photos Shared Album Link
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide((g) => !g)}
                      className="text-xs text-starlight hover:opacity-80 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>
                        {showSetupGuide ? "Hide Steps" : "Show Step-by-Step Help"}
                      </span>
                    </button>
                  </div>

                  {showSetupGuide && (
                    <div className="rounded-xl bg-starlight/10 border border-starlight/25 p-3.5 text-xs text-cosmos-text space-y-1.5">
                      <p className="font-bold text-starlight">
                        How to connect a Google Photos album in 3 easy steps:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-cosmos-text/90">
                        <li>
                          Open the <strong>Google Photos</strong> app on your phone (or visit{" "}
                          <span className="underline">photos.google.com</span>) and pick the album you want to show.
                        </li>
                        <li>
                          Tap <strong>Share</strong>, then tap <strong>Create link</strong> (or <strong>Copy link</strong>).
                        </li>
                        <li>
                          Paste that link below! Any time you add new pictures to that album on your phone, they will automatically appear on your calendar.
                        </li>
                      </ol>
                    </div>
                  )}

                  <input
                    type="url"
                    required
                    value={draftConfig.googlePhotosShareUrl}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        googlePhotosShareUrl: e.target.value,
                      }))
                    }
                    placeholder="Paste your link here (e.g., https://photos.app.goo.gl/...)"
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text placeholder:text-cosmos-muted/60 focus:outline-none focus:border-starlight transition"
                  />
                </div>
              )}

              {/* Immich Setup Walkthrough */}
              {draftConfig.provider === "immich" && (
                <div className="space-y-3 rounded-2xl bg-cosmos-deep/70 border border-cosmos-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-starlight">
                      Connect Your Immich Album
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide((g) => !g)}
                      className="text-xs text-starlight hover:opacity-80 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>
                        {showSetupGuide ? "Hide Steps" : "Show Step-by-Step Help"}
                      </span>
                    </button>
                  </div>

                  {showSetupGuide && (
                    <div className="rounded-xl bg-starlight/10 border border-starlight/25 p-3.5 text-xs text-cosmos-text space-y-1.5">
                      <p className="font-bold text-starlight">
                        How to share an album from Immich:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-cosmos-text/90">
                        <li>
                          Open your favorite album in <strong>Immich</strong> and click the <strong>Share</strong> button.
                        </li>
                        <li>
                          Click <strong>Create Link</strong> and copy the link.
                        </li>
                        <li>
                          Paste the shared link in the first box below!
                        </li>
                      </ol>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-cosmos-text mb-1">
                      Immich Shared Album Link (Easiest)
                    </label>
                    <input
                      type="url"
                      value={draftConfig.immichShareUrl}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          immichShareUrl: e.target.value,
                        }))
                      }
                      placeholder="https://photos.myfamily.com/share/..."
                      className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text placeholder:text-cosmos-muted/60 focus:outline-none focus:border-starlight transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-cosmos-muted mb-1">
                        Or Immich Web Address (Optional)
                      </label>
                      <input
                        type="url"
                        value={draftConfig.immichBaseUrl}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            immichBaseUrl: e.target.value,
                          }))
                        }
                        placeholder="https://photos.myfamily.com"
                        className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text placeholder:text-cosmos-muted/60 focus:outline-none focus:border-starlight transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cosmos-muted mb-1">
                        Access Key{" "}
                        {config.hasImmichApiKey && !clearImmichKey && (
                          <span className="text-starlight">(Saved)</span>
                        )}
                      </label>
                      <input
                        type="password"
                        value={draftConfig.immichApiKey}
                        onChange={(e) => {
                          setClearImmichKey(false);
                          setDraftConfig((prev) => ({
                            ...prev,
                            immichApiKey: e.target.value,
                          }));
                        }}
                        placeholder={
                          config.hasImmichApiKey && !clearImmichKey
                            ? "•••••••• (Leave blank to keep)"
                            : "Not needed if using a Shared Link"
                        }
                        className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text placeholder:text-cosmos-muted/60 focus:outline-none focus:border-starlight transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Slideshow & Framing Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-1.5">
                    Number of Photos in Rotation
                  </label>
                  <select
                    value={draftConfig.maxCachedPhotos}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        maxCachedPhotos: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text focus:outline-none focus:border-starlight transition"
                  >
                    <option value={10}>Up to 10 photos</option>
                    <option value={15}>Up to 15 photos (Recommended)</option>
                    <option value={25}>Up to 25 photos</option>
                    <option value={50}>Up to 50 photos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-1.5">
                    Time on Each Photo
                  </label>
                  <select
                    value={draftConfig.slideIntervalSeconds}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        slideIntervalSeconds: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text focus:outline-none focus:border-starlight transition"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds (Recommended)</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-1.5">
                    Vertical Phone Photos
                  </label>
                  <select
                    value={draftConfig.portraitFillMode}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        portraitFillMode: e.target.value as "blur" | "cover",
                      }))
                    }
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text focus:outline-none focus:border-starlight transition"
                  >
                    <option value="blur">
                      Fit Entire Photo with Soft Blurred Sides (Recommended)
                    </option>
                    <option value="cover">
                      Fill Entire Screen (May Crop Edges)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cosmos-muted mb-1.5">
                    Photo Transition Style
                  </label>
                  <select
                    value={draftConfig.transitionDurationMs}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        transitionDurationMs: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-sm text-cosmos-text focus:outline-none focus:border-starlight transition"
                  >
                    <option value={1500}>Normal Fade</option>
                    <option value={2500}>Slow, Gentle Fade (Recommended)</option>
                    <option value={4000}>Extra-Slow Relaxing Fade</option>
                  </select>
                </div>
              </div>

              {/* Brightness & On-Screen Info Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-2xl bg-cosmos-deep/60 border border-cosmos-border p-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-cosmos-text mb-1.5">
                    <span>Photo Brightness</span>
                    <span className="text-starlight">
                      {draftConfig.brightnessPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={draftConfig.brightnessPercent}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        brightnessPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-starlight cursor-pointer"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "shuffle", label: "Shuffle Order" },
                      { key: "showClock", label: "Clock" },
                      { key: "showWeather", label: "Weather" },
                      { key: "showNextEvent", label: "Next Event" },
                    ] as const
                  ).map((toggle) => {
                    const active = Boolean(draftConfig[toggle.key]);
                    return (
                      <button
                        key={toggle.key}
                        type="button"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            [toggle.key]: !prev[toggle.key],
                          }))
                        }
                        className={`min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? "bg-starlight/15 border-starlight text-cosmos-text"
                            : "bg-cosmos-surface border-cosmos-border text-cosmos-muted hover:text-cosmos-text"
                        }`}
                      >
                        <Check
                          className={`w-3.5 h-3.5 ${
                            active ? "opacity-100 text-starlight" : "opacity-0"
                          }`}
                        />
                        <span>{toggle.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Friendly Refresh Album Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-cosmos-surface/70 border border-cosmos-border px-4 py-3 text-xs text-cosmos-muted">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-starlight shrink-0" />
                  <span>
                    <strong className="text-cosmos-text">
                      {warmedCount > 0 ? warmedCount : photos.length} of{" "}
                      {photos.length} photos
                    </strong>{" "}
                    ready for your slideshow. Added new pictures to your album recently?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshAlbumPhotos}
                  disabled={isSyncing}
                  className="min-h-[48px] px-3.5 py-2 rounded-xl bg-cosmos-card hover:bg-cosmos-cardHover border border-cosmos-border text-cosmos-text font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-starlight ${
                      isSyncing ? "animate-spin" : ""
                    }`}
                  />
                  <span>Refresh Album Photos</span>
                </button>
              </div>

              {/* Status or Warning Feedback Banner */}
              {(statusBanner || syncWarning) && (
                <div
                  className={`rounded-2xl p-3.5 text-xs font-semibold flex items-start gap-2.5 border ${
                    statusBanner?.type === "error"
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : statusBanner?.type === "warning" ||
                        (!statusBanner && syncWarning)
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-starlight/15 border-starlight/40 text-cosmos-text"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-starlight" />
                  <span>{statusBanner?.message || syncWarning}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cosmos-border">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-cosmos-text text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl theme-focus-pill disabled:opacity-50 text-sm font-bold flex items-center gap-2 transition shadow-lg cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading Photos...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Show Photos</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
