/**
 * Photo & Album Screensaver Connector Engine
 *
 * Architectural Principles (ADR 0004):
 * 1. Zero image binaries or per-photo rows stored in Turso DB (only a tiny per-Galaxy `screensaver_config` JSON).
 * 2. Connectors resolve <= 1080p preview URLs from Google Photos Shared Album links (`=w1920-h1080`)
 *    or Immich (`size=preview` 1080p thumbnails via Shared Link or API key).
 * 3. Kiosk browsers cache the capped playlist (default 15 images) locally in `CacheStorage`
 *    so 24/7 rotation consumes zero ongoing Vercel serverless compute or Turso reads.
 */

export type PhotoProvider = "sample" | "google_photos" | "immich";
export type PortraitFillMode = "blur" | "cover";

export interface ScreensaverConfig {
  provider: PhotoProvider;
  albumName: string;
  googlePhotosShareUrl: string;
  immichBaseUrl: string;
  immichShareUrl: string;
  immichAlbumId: string;
  immichApiKey: string;
  hasImmichApiKey?: boolean;
  slideIntervalSeconds: number;
  transitionDurationMs: number;
  maxCachedPhotos: number;
  shuffle: boolean;
  portraitFillMode: PortraitFillMode;
  brightnessPercent: number;
  showClock: boolean;
  showWeather: boolean;
  showNextEvent: boolean;
  updatedAt?: string;
}

export interface ResolvedPhotoItem {
  id: string;
  url: string;
  provider: PhotoProvider;
  width?: number;
  height?: number;
  isPortrait?: boolean;
  caption?: string;
  takenAt?: string;
}

export const DEFAULT_SCREENSAVER_CONFIG: ScreensaverConfig = {
  provider: "sample",
  albumName: "Curated Ambient Horizons",
  googlePhotosShareUrl: "",
  immichBaseUrl: "",
  immichShareUrl: "",
  immichAlbumId: "",
  immichApiKey: "",
  hasImmichApiKey: false,
  slideIntervalSeconds: 15,
  transitionDurationMs: 2500,
  maxCachedPhotos: 15,
  shuffle: true,
  portraitFillMode: "blur",
  brightnessPercent: 85,
  showClock: true,
  showWeather: true,
  showNextEvent: true,
};

export const CURATED_SAMPLE_PHOTOS: ResolvedPhotoItem[] = [
  {
    id: "sample-alpine-dawn",
    url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1920&q=80",
    provider: "sample",
    width: 1920,
    height: 1080,
    isPortrait: false,
    caption: "Sunlit Canopy",
  },
  {
    id: "sample-family-warmth",
    url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1920&q=80",
    provider: "sample",
    width: 1920,
    height: 1080,
    isPortrait: false,
    caption: "Golden Hour Walk",
  },
  {
    id: "sample-mountain-lake",
    url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1920&q=80",
    provider: "sample",
    width: 1920,
    height: 1080,
    isPortrait: false,
    caption: "Emerald Fjord",
  },
  {
    id: "sample-portrait-redwoods",
    url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1080&q=80",
    provider: "sample",
    width: 1080,
    height: 1620,
    isPortrait: true,
    caption: "Towering Redwoods (Portrait Fill)",
  },
  {
    id: "sample-coastal-dusk",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    provider: "sample",
    width: 1920,
    height: 1080,
    isPortrait: false,
    caption: "Pacific Horizon",
  },
];

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * Parses and normalizes a raw JSON string or object into a safe ScreensaverConfig.
 */
export function parseScreensaverConfig(
  raw: string | Partial<ScreensaverConfig> | null | undefined
): ScreensaverConfig {
  let parsed: Partial<ScreensaverConfig> = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }

  const provider: PhotoProvider =
    parsed.provider === "google_photos" ||
    parsed.provider === "immich" ||
    parsed.provider === "sample"
      ? parsed.provider
      : DEFAULT_SCREENSAVER_CONFIG.provider;

  const portraitFillMode: PortraitFillMode =
    parsed.portraitFillMode === "cover" || parsed.portraitFillMode === "blur"
      ? parsed.portraitFillMode
      : DEFAULT_SCREENSAVER_CONFIG.portraitFillMode;

  const immichApiKey =
    typeof parsed.immichApiKey === "string" ? parsed.immichApiKey.trim() : "";

  return {
    provider,
    albumName:
      typeof parsed.albumName === "string"
        ? parsed.albumName.trim().slice(0, 120)
        : DEFAULT_SCREENSAVER_CONFIG.albumName,
    googlePhotosShareUrl:
      typeof parsed.googlePhotosShareUrl === "string"
        ? parsed.googlePhotosShareUrl.trim().slice(0, 500)
        : "",
    immichBaseUrl:
      typeof parsed.immichBaseUrl === "string"
        ? parsed.immichBaseUrl.trim().replace(/\/+$/, "").slice(0, 300)
        : "",
    immichShareUrl:
      typeof parsed.immichShareUrl === "string"
        ? parsed.immichShareUrl.trim().slice(0, 500)
        : "",
    immichAlbumId:
      typeof parsed.immichAlbumId === "string"
        ? parsed.immichAlbumId.trim().slice(0, 120)
        : "",
    immichApiKey,
    hasImmichApiKey: Boolean(immichApiKey || parsed.hasImmichApiKey),
    slideIntervalSeconds: clampInt(
      parsed.slideIntervalSeconds,
      8,
      300,
      DEFAULT_SCREENSAVER_CONFIG.slideIntervalSeconds
    ),
    transitionDurationMs: clampInt(
      parsed.transitionDurationMs,
      1000,
      5000,
      DEFAULT_SCREENSAVER_CONFIG.transitionDurationMs
    ),
    maxCachedPhotos: clampInt(
      parsed.maxCachedPhotos,
      5,
      50,
      DEFAULT_SCREENSAVER_CONFIG.maxCachedPhotos
    ),
    shuffle:
      typeof parsed.shuffle === "boolean"
        ? parsed.shuffle
        : DEFAULT_SCREENSAVER_CONFIG.shuffle,
    portraitFillMode,
    brightnessPercent: clampInt(
      parsed.brightnessPercent,
      40,
      100,
      DEFAULT_SCREENSAVER_CONFIG.brightnessPercent
    ),
    showClock:
      typeof parsed.showClock === "boolean"
        ? parsed.showClock
        : DEFAULT_SCREENSAVER_CONFIG.showClock,
    showWeather:
      typeof parsed.showWeather === "boolean"
        ? parsed.showWeather
        : DEFAULT_SCREENSAVER_CONFIG.showWeather,
    showNextEvent:
      typeof parsed.showNextEvent === "boolean"
        ? parsed.showNextEvent
        : DEFAULT_SCREENSAVER_CONFIG.showNextEvent,
    updatedAt:
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : undefined,
  };
}

/**
 * Masks sensitive connector secrets before sending config to client browsers.
 */
export function maskScreensaverConfig(config: ScreensaverConfig): ScreensaverConfig {
  return {
    ...config,
    hasImmichApiKey: Boolean(config.immichApiKey),
    immichApiKey: "",
  };
}

/**
 * Merges incoming config updates with existing config while preserving masked API keys.
 */
export function mergeScreensaverConfigUpdate(
  existing: ScreensaverConfig,
  incoming: Partial<ScreensaverConfig> & { clearImmichApiKey?: boolean }
): ScreensaverConfig {
  const merged = parseScreensaverConfig({
    ...existing,
    ...incoming,
    updatedAt: new Date().toISOString(),
  });

  if (incoming.clearImmichApiKey) {
    merged.immichApiKey = "";
    merged.hasImmichApiKey = false;
  } else if (
    incoming.immichApiKey === undefined ||
    incoming.immichApiKey === "" ||
    incoming.immichApiKey === "••••••••"
  ) {
    merged.immichApiKey = existing.immichApiKey || "";
    merged.hasImmichApiKey = Boolean(merged.immichApiKey);
  }

  return merged;
}

/**
 * Validates that a URL is a legitimate Google Photos Shared Album link.
 */
export function validateGooglePhotosShareUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "Google Photos shared album link is required." };
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Google Photos link must use https://." };
    }
    const host = parsed.hostname.toLowerCase();
    const isShortLink = host === "photos.app.goo.gl";
    const isFullShareLink =
      host === "photos.google.com" && parsed.pathname.startsWith("/share/");

    if (!isShortLink && !isFullShareLink) {
      return {
        valid: false,
        error:
          "Please paste a valid Google Photos shared link (https://photos.app.goo.gl/... or https://photos.google.com/share/...).",
      };
    }

    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }
}

/**
 * Validates that a URL is a legitimate Google Photos CDN image URL (`lh3.googleusercontent.com`).
 */
export function validateGooglePhotosCdnUrl(rawUrl: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "Google Photos CDN URL is required." };
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== "lh3.googleusercontent.com"
    ) {
      return {
        valid: false,
        error: "Only https://lh3.googleusercontent.com image URLs are permitted.",
      };
    }
    return { valid: true, url: toGooglePhotos1080pUrl(parsed.toString(), 1920, 1080) };
  } catch {
    return { valid: false, error: "Invalid Google Photos CDN URL." };
  }
}

/**
 * Rewrites a Google Photos `lh3.googleusercontent.com` base URL to request a <= 1080p image.
 */
export function toGooglePhotos1080pUrl(
  rawUrl: string,
  maxWidth = 1920,
  maxHeight = 1080
): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const cleaned = rawUrl
    .trim()
    .replace(/\\u003d/gi, "=")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");

  // Strip existing Google image sizing suffix (=w..., =s..., =d, etc.)
  const baseUrl = cleaned.replace(/=[a-zA-Z0-9_-]+$/, "");
  return `${baseUrl}=w${maxWidth}-h${maxHeight}`;
}

/**
 * Deterministic extractor for Google Photos Shared Album HTML pages.
 * Extracts `lh3.googleusercontent.com` photo assets, captures dimensions when available,
 * filters out tiny profile avatars/icons, and caps resolution at 1080p (`=w1920-h1080`).
 */
export function extractGooglePhotosFromHtml(
  html: string,
  maxPhotos = 50
): ResolvedPhotoItem[] {
  if (!html || typeof html !== "string") return [];

  // Normalize JSON-escaped sequences inside script blocks
  const normalized = html
    .replace(/\\u003d/gi, "=")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/");

  const itemsByBaseUrl = new Map<string, ResolvedPhotoItem>();

  // 1. Match structured array tuples: ["https://lh3.googleusercontent.com/pw/...", width, height]
  const tupleRegex =
    /"(https:\/\/lh3\.googleusercontent\.com\/(?:pw\/)?[A-Za-z0-9_-]{24,})"\s*,\s*(\d{2,5})\s*,\s*(\d{2,5})/g;
  let match: RegExpExecArray | null;

  while ((match = tupleRegex.exec(normalized)) !== null) {
    const baseUrl = match[1].replace(/=[a-zA-Z0-9_-]+$/, "");
    if (baseUrl.includes("/a/") || baseUrl.includes("/a-/")) continue;
    const width = Number(match[2]);
    const height = Number(match[3]);
    // Skip tiny icons or UI assets (< 200px)
    if (width < 200 || height < 200) continue;

    if (!itemsByBaseUrl.has(baseUrl)) {
      const idSuffix = baseUrl.slice(-24).replace(/[^A-Za-z0-9]/g, "");
      itemsByBaseUrl.set(baseUrl, {
        id: `gphoto-${idSuffix || itemsByBaseUrl.size + 1}`,
        url: toGooglePhotos1080pUrl(baseUrl, 1920, 1080),
        provider: "google_photos",
        width,
        height,
        isPortrait: height > width,
      });
      if (itemsByBaseUrl.size >= maxPhotos) break;
    }
  }

  // 2. Fallback: Match standalone `/pw/` shared album photo URLs if tuples weren't matched or more remain
  if (itemsByBaseUrl.size < maxPhotos) {
    const standaloneRegex =
      /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]{24,}/g;
    while ((match = standaloneRegex.exec(normalized)) !== null) {
      const baseUrl = match[0].replace(/=[a-zA-Z0-9_-]+$/, "");
      if (!itemsByBaseUrl.has(baseUrl)) {
        const idSuffix = baseUrl.slice(-24).replace(/[^A-Za-z0-9]/g, "");
        itemsByBaseUrl.set(baseUrl, {
          id: `gphoto-${idSuffix || itemsByBaseUrl.size + 1}`,
          url: toGooglePhotos1080pUrl(baseUrl, 1920, 1080),
          provider: "google_photos",
        });
        if (itemsByBaseUrl.size >= maxPhotos) break;
      }
    }
  }

  return Array.from(itemsByBaseUrl.values()).slice(0, maxPhotos);
}

/**
 * Validates external Immich server URLs and prevents SSRF against cloud metadata endpoints.
 */
export function validateExternalConnectorUrl(rawUrl: string): {
  valid: boolean;
  origin?: string;
  url?: URL;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "Connector URL is required." };
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: "URL must start with https:// or http://." };
    }

    const host = parsed.hostname.toLowerCase();
    // Block cloud metadata services & loopback SSRF vectors
    const blockedHosts = new Set([
      "169.254.169.254",
      "metadata.google.internal",
      "metadata",
      "0.0.0.0",
      "[::]",
    ]);
    if (blockedHosts.has(host) || host.startsWith("169.254.")) {
      return { valid: false, error: "Restricted network address." };
    }

    return {
      valid: true,
      origin: parsed.origin,
      url: parsed,
    };
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }
}

/**
 * Parses an Immich Shared Album URL (e.g. `https://photos.example.com/share/abcd1234` or `/s/abcd1234`)
 * into its base server origin and share key.
 */
export function parseImmichShareLink(shareUrl: string): {
  valid: boolean;
  baseUrl?: string;
  shareKey?: string;
  error?: string;
} {
  const check = validateExternalConnectorUrl(shareUrl);
  if (!check.valid || !check.url) {
    return { valid: false, error: check.error || "Invalid Immich shared link." };
  }

  const parsed = check.url;
  const queryKey = parsed.searchParams.get("key")?.trim();
  const pathMatch = parsed.pathname.match(/\/(?:share|s)\/([A-Za-z0-9_-]+)/);
  const shareKey = (pathMatch?.[1] || queryKey || "").trim();

  if (!shareKey) {
    return {
      valid: false,
      error:
        "Could not find a share key in the Immich link. Expected format: https://your-immich-domain/share/<key>",
    };
  }

  // Support Immich hosted under a subpath before /share/<key>
  const basePath = pathMatch
    ? parsed.pathname.slice(0, pathMatch.index || 0).replace(/\/+$/, "")
    : "";

  return {
    valid: true,
    baseUrl: `${parsed.origin}${basePath}`,
    shareKey,
  };
}

/**
 * Normalizes an Immich API album or shared-link response into `ResolvedPhotoItem[]`.
 */
export function normalizeImmichAssets(
  rawPayload: any,
  galaxyId: string,
  maxPhotos = 50
): ResolvedPhotoItem[] {
  if (!rawPayload) return [];

  let rawAssets: any[] = [];
  if (Array.isArray(rawPayload)) {
    rawAssets = rawPayload;
  } else if (Array.isArray(rawPayload.assets) && rawPayload.assets.length > 0) {
    rawAssets = rawPayload.assets;
  } else if (rawPayload.album && Array.isArray(rawPayload.album.assets)) {
    rawAssets = rawPayload.album.assets;
  }

  const results: ResolvedPhotoItem[] = [];
  const seenIds = new Set<string>();

  for (const asset of rawAssets) {
    if (!asset || typeof asset.id !== "string" || !asset.id.trim()) continue;
    const assetId = asset.id.trim();
    if (seenIds.has(assetId)) continue;

    // Skip video assets so kiosks only pull lightweight 1080p still previews
    const assetType = String(asset.type || "IMAGE").toUpperCase();
    const mimeType = String(asset.originalMimeType || "").toLowerCase();
    if (assetType === "VIDEO" || mimeType.startsWith("video/")) {
      continue;
    }

    seenIds.add(assetId);

    const width = Number(
      asset.exifInfo?.exifImageWidth ?? asset.width ?? 0
    );
    const height = Number(
      asset.exifInfo?.exifImageHeight ?? asset.height ?? 0
    );
    const hasDimensions = width > 0 && height > 0;

    results.push({
      id: `immich-${assetId}`,
      url: `/api/photos/proxy?galaxyId=${encodeURIComponent(galaxyId)}&assetId=${encodeURIComponent(assetId)}`,
      provider: "immich",
      width: hasDimensions ? width : undefined,
      height: hasDimensions ? height : undefined,
      isPortrait: hasDimensions ? height > width : undefined,
      caption:
        typeof asset.exifInfo?.description === "string" &&
        asset.exifInfo.description.trim()
          ? asset.exifInfo.description.trim()
          : undefined,
      takenAt:
        typeof asset.exifInfo?.dateTimeOriginal === "string"
          ? asset.exifInfo.dateTimeOriginal
          : typeof asset.fileCreatedAt === "string"
          ? asset.fileCreatedAt
          : undefined,
    });

    if (results.length >= maxPhotos) break;
  }

  return results;
}

/**
 * Builds the upstream Immich 1080p (`size=preview`) thumbnail request URL and headers
 * for the server proxy endpoint.
 */
export function buildImmichUpstreamThumbnailUrl(
  config: ScreensaverConfig,
  assetId: string
): { url: string; headers: Record<string, string> } | null {
  const cleanAssetId = (assetId || "").trim().replace(/^immich-/, "");
  if (!cleanAssetId || !/^[A-Za-z0-9_-]+$/.test(cleanAssetId)) {
    return null;
  }

  // Case 1: Immich Shared Link URL configured
  if (config.immichShareUrl && config.immichShareUrl.trim()) {
    const parsedShare = parseImmichShareLink(config.immichShareUrl);
    if (parsedShare.valid && parsedShare.baseUrl && parsedShare.shareKey) {
      const url = `${parsedShare.baseUrl}/api/assets/${encodeURIComponent(
        cleanAssetId
      )}/thumbnail?size=preview&key=${encodeURIComponent(parsedShare.shareKey)}`;
      const headers: Record<string, string> = {
        Accept: "image/webp,image/jpeg,image/*,*/*;q=0.8",
      };
      if (config.immichApiKey) {
        headers["x-api-key"] = config.immichApiKey;
      }
      return { url, headers };
    }
  }

  // Case 2: Direct Immich Base URL + API Key
  if (config.immichBaseUrl && config.immichBaseUrl.trim()) {
    const check = validateExternalConnectorUrl(config.immichBaseUrl);
    if (!check.valid) return null;
    const baseUrl = config.immichBaseUrl.trim().replace(/\/+$/, "");
    const url = `${baseUrl}/api/assets/${encodeURIComponent(
      cleanAssetId
    )}/thumbnail?size=preview`;
    const headers: Record<string, string> = {
      Accept: "image/webp,image/jpeg,image/*,*/*;q=0.8",
    };
    if (config.immichApiKey) {
      headers["x-api-key"] = config.immichApiKey;
    }
    return { url, headers };
  }

  return null;
}

/**
 * Selects and optionally shuffles the photo list while strictly capping at `maxCachedPhotos`
 * (e.g., 10–15 photos per galaxy) to bound client memory and network usage.
 */
export function selectPhotosForRotation(
  photos: ResolvedPhotoItem[],
  maxCachedPhotos: number,
  shuffle: boolean,
  seed?: number
): ResolvedPhotoItem[] {
  const cap = clampInt(
    maxCachedPhotos,
    5,
    50,
    DEFAULT_SCREENSAVER_CONFIG.maxCachedPhotos
  );
  const unique: ResolvedPhotoItem[] = [];
  const seen = new Set<string>();

  for (const item of photos) {
    if (!item || !item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  if (unique.length <= 1 || !shuffle) {
    return unique.slice(0, cap);
  }

  // Deterministic Fisher-Yates shuffle when seed is provided, or Math.random() otherwise
  const copy = [...unique];
  let state = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
  const nextRand = () => {
    if (seed === undefined) return Math.random();
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  return copy.slice(0, cap);
}

/**
 * Resolves live photos from the configured upstream connector (Google Photos Shared Link or Immich).
 */
export async function resolveConnectorPhotos(
  galaxyId: string,
  config: ScreensaverConfig,
  fetchImpl: typeof fetch = fetch
): Promise<{
  photos: ResolvedPhotoItem[];
  source: PhotoProvider;
  warning?: string;
}> {
  const cap = clampInt(config.maxCachedPhotos, 5, 50, 15);

  if (config.provider === "google_photos") {
    const validation = validateGooglePhotosShareUrl(config.googlePhotosShareUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      return {
        photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
        source: "sample",
        warning: validation.error || "Google Photos shared link is not configured.",
      };
    }

    try {
      const res = await fetchImpl(validation.normalizedUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning: `Google Photos returned HTTP ${res.status}. Make sure link sharing is enabled on the album.`,
        };
      }

      const html = await res.text();
      const extracted = extractGooglePhotosFromHtml(html, 100);
      if (extracted.length === 0) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning:
            "No photos found in that Google Photos shared link. Ensure the album is shared publicly via link and contains photos.",
        };
      }

      return {
        photos: selectPhotosForRotation(extracted, cap, config.shuffle),
        source: "google_photos",
      };
    } catch (err: any) {
      return {
        photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
        source: "sample",
        warning: `Could not reach Google Photos shared link (${err?.message || "network error"}).`,
      };
    }
  }

  if (config.provider === "immich") {
    // 1. Immich Shared Link mode
    if (config.immichShareUrl && config.immichShareUrl.trim()) {
      const parsedShare = parseImmichShareLink(config.immichShareUrl);
      if (!parsedShare.valid || !parsedShare.baseUrl || !parsedShare.shareKey) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning: parsedShare.error || "Invalid Immich shared link.",
        };
      }

      try {
        const shareEndpoint = `${parsedShare.baseUrl}/api/shared-links/me?key=${encodeURIComponent(
          parsedShare.shareKey
        )}`;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (config.immichApiKey) {
          headers["x-api-key"] = config.immichApiKey;
        }
        const res = await fetchImpl(shareEndpoint, { method: "GET", headers });
        if (!res.ok) {
          return {
            photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
            source: "sample",
            warning: `Immich shared link returned HTTP ${res.status}. Check that the share link is active and not password-locked.`,
          };
        }

        const payload = await res.json();
        const normalized = normalizeImmichAssets(payload, galaxyId, 100);
        if (normalized.length === 0) {
          return {
            photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
            source: "sample",
            warning: "No image assets found in the Immich shared link.",
          };
        }

        return {
          photos: selectPhotosForRotation(normalized, cap, config.shuffle),
          source: "immich",
        };
      } catch (err: any) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning: `Could not connect to Immich shared link (${err?.message || "network error"}).`,
        };
      }
    }

    // 2. Immich Server Base URL + API Key (+ Album ID) mode
    if (config.immichBaseUrl && config.immichBaseUrl.trim()) {
      const urlCheck = validateExternalConnectorUrl(config.immichBaseUrl);
      if (!urlCheck.valid) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning: urlCheck.error || "Invalid Immich server URL.",
        };
      }

      if (!config.immichApiKey) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning:
            "Provide either an Immich Shared Album Link or an Immich API Key.",
        };
      }

      try {
        const baseUrl = config.immichBaseUrl.trim().replace(/\/+$/, "");
        const headers: Record<string, string> = {
          Accept: "application/json",
          "x-api-key": config.immichApiKey,
        };

        let targetAlbumId = config.immichAlbumId?.trim();
        if (!targetAlbumId) {
          const albumsRes = await fetchImpl(`${baseUrl}/api/albums`, {
            method: "GET",
            headers,
          });
          if (!albumsRes.ok) {
            return {
              photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
              source: "sample",
              warning: `Immich /api/albums returned HTTP ${albumsRes.status}. Verify your server URL and API key.`,
            };
          }
          const albumsList = await albumsRes.json();
          if (Array.isArray(albumsList) && albumsList.length > 0) {
            targetAlbumId = albumsList[0].id;
          }
        }

        if (!targetAlbumId) {
          return {
            photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
            source: "sample",
            warning: "No albums found on the Immich server.",
          };
        }

        const albumRes = await fetchImpl(
          `${baseUrl}/api/albums/${encodeURIComponent(targetAlbumId)}`,
          { method: "GET", headers }
        );
        if (!albumRes.ok) {
          return {
            photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
            source: "sample",
            warning: `Immich album request returned HTTP ${albumRes.status}.`,
          };
        }

        const albumData = await albumRes.json();
        const normalized = normalizeImmichAssets(albumData, galaxyId, 100);
        if (normalized.length === 0) {
          return {
            photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
            source: "sample",
            warning: "The selected Immich album contains no image assets.",
          };
        }

        return {
          photos: selectPhotosForRotation(normalized, cap, config.shuffle),
          source: "immich",
        };
      } catch (err: any) {
        return {
          photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
          source: "sample",
          warning: `Could not reach Immich server (${err?.message || "network error"}).`,
        };
      }
    }

    return {
      photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, false),
      source: "sample",
      warning: "Configure an Immich Shared Album Link or Server URL + API Key.",
    };
  }

  return {
    photos: selectPhotosForRotation(CURATED_SAMPLE_PHOTOS, cap, config.shuffle),
    source: "sample",
  };
}
