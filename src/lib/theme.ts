"use client";

import { useState, useEffect } from "react";

export type ThemeArchetype = "creamy" | "osl";

export type AppTheme =
  | "mocha"
  | "matcha"
  | "oat"
  | "latte"
  | "over-volt-blue"
  | "yakuza-purple"
  | "red-dragon"
  | "neon-green"
  | "halloween";

export interface ThemePalette {
  canvas: string; // Mother Color / Abyss (70% recess)
  deep: string; // Elevated container
  surface: string; // Interactive surface tile
  card: string; // Content card base
  cardHover: string; // Content card hover
  border: string; // MutedBorder (whisper structure)
  borderLight: string; // Specular / focus border
  textPrimary: string; // Cream or White-Hot Core (never #FFFFFF/#000000)
  textMuted: string; // Tinted secondary metadata
  accentPrimary: string; // 10% Focal Specular / Keycap fill
  accentTension: string; // Warm/Cool optical tension accent
  focusText: string; // Text color inside active keycap / focal pill
}

export interface ThemeOption {
  id: AppTheme;
  name: string;
  shortName: string;
  emoji: string;
  archetype: ThemeArchetype;
  isLight?: boolean;
  description: string;
  palette: ThemePalette;
}

export const THEME_OPTIONS: ThemeOption[] = [
  // ==========================================================
  // ARCHETYPE A: "SUPER CREAMY" (Matte PBT Keycaps & Unix Rice)
  // ==========================================================
  {
    id: "mocha",
    name: "Mocha (Espresso & Taro)",
    shortName: "Mocha",
    emoji: "☕",
    archetype: "creamy",
    description: "Deep roasted espresso-indigo canvas with matte taro mauve & peach PBT keycaps",
    palette: {
      canvas: "#1E1E2E",
      deep: "#232336",
      surface: "#28283D",
      card: "#2E2E46",
      cardHover: "#363652",
      border: "#3E3E5E",
      borderLight: "#585B70",
      textPrimary: "#CDD6F4",
      textMuted: "#9399B2",
      accentPrimary: "#CBA6F7",
      accentTension: "#FAB387",
      focusText: "#1E1E2E",
    },
  },
  {
    id: "matcha",
    name: "Matcha (Ceremonial Green)",
    shortName: "Matcha",
    emoji: "🍵",
    archetype: "creamy",
    description: "Earthy moss charcoal with river-stone tiles, steamed oat text, and matcha keycaps",
    palette: {
      canvas: "#1E2326",
      deep: "#23292D",
      surface: "#272E33",
      card: "#2E383C",
      cardHover: "#374145",
      border: "#414B50",
      borderLight: "#56635F",
      textPrimary: "#D3C6AA",
      textMuted: "#9DA9A0",
      accentPrimary: "#A7C080",
      accentTension: "#E67E80",
      focusText: "#1E2326",
    },
  },
  {
    id: "oat",
    name: "Oat (Toasted Sesame & Linen)",
    shortName: "Oat",
    emoji: "🌾",
    archetype: "creamy",
    description: "Warm toasted barley & clay surfaces with unbleached parchment and salted caramel",
    palette: {
      canvas: "#22201E",
      deep: "#282523",
      surface: "#2E2B28",
      card: "#36322E",
      cardHover: "#403B36",
      border: "#4A443F",
      borderLight: "#635B54",
      textPrimary: "#E5DFD5",
      textMuted: "#A89F94",
      accentPrimary: "#D4A373",
      accentTension: "#A3B18A",
      focusText: "#22201E",
    },
  },
  {
    id: "latte",
    name: "Latte (Daylight Espresso)",
    shortName: "Latte",
    emoji: "🥛",
    archetype: "creamy",
    isLight: true,
    description: "Steamed almond milk daylight canvas with warm crema tiles and roasted espresso ink",
    palette: {
      canvas: "#EFF1F5",
      deep: "#E6E9EF",
      surface: "#DCE0E8",
      card: "#F6F7FA",
      cardHover: "#E6E9EF",
      border: "#CCD0DA",
      borderLight: "#ACB0BE",
      textPrimary: "#4C4F69",
      textMuted: "#6C6F85",
      accentPrimary: "#7287FD",
      accentTension: "#DF8E1D",
      focusText: "#EFF1F5",
    },
  },

  // ==========================================================
  // ARCHETYPE B: "CYBERPUNK OSL" (Fluorescent Light-Spill & HUDs)
  // ==========================================================
  {
    id: "over-volt-blue",
    name: "Over-Volt Blue (Arc Plasma)",
    shortName: "Over-Volt",
    emoji: "⚡",
    archetype: "osl",
    description: "Midnight petrol wet asphalt with electric arc blue OSL halation and volt yellow tension",
    palette: {
      canvas: "#070A12",
      deep: "#0B101C",
      surface: "#101626",
      card: "#141C30",
      cardHover: "#1A253E",
      border: "#223052",
      borderLight: "#33497A",
      textPrimary: "#D8FCFF",
      textMuted: "#7C93B8",
      accentPrimary: "#00F0FF",
      accentTension: "#FCEE0A",
      focusText: "#D8FCFF",
    },
  },
  {
    id: "yakuza-purple",
    name: "Yakuza Purple (Kamurocho Neon)",
    shortName: "Kamurocho",
    emoji: "🏮",
    archetype: "osl",
    description: "Bruised aubergine shadows bathed in ultraviolet magenta neon and streetlight gold",
    palette: {
      canvas: "#0D0714",
      deep: "#120A1C",
      surface: "#170E24",
      card: "#1E122F",
      cardHover: "#27183D",
      border: "#362054",
      borderLight: "#52307E",
      textPrimary: "#FFE6FA",
      textMuted: "#9E82B8",
      accentPrimary: "#D900FF",
      accentTension: "#FFB800",
      focusText: "#FFE6FA",
    },
  },
  {
    id: "red-dragon",
    name: "Red Dragon (Tactical Visor)",
    shortName: "Red Dragon",
    emoji: "🐉",
    archetype: "osl",
    description: "Carbon obsidian & warm gunmetal with laser ruby OSL edges and katana steel cyan",
    palette: {
      canvas: "#0A0808",
      deep: "#100C0D",
      surface: "#161112",
      card: "#1E1618",
      cardHover: "#281D20",
      border: "#3A272B",
      borderLight: "#59383E",
      textPrimary: "#FFF0ED",
      textMuted: "#A88A8E",
      accentPrimary: "#FF1E42",
      accentTension: "#73F3FF",
      focusText: "#FFF0ED",
    },
  },
  {
    id: "neon-green",
    name: "Neon Green (Bio-Matrix)",
    shortName: "Bio-Matrix",
    emoji: "📟",
    archetype: "osl",
    description: "Phosphor black & CRT olive-slate with acid venom green light-spill and amber tension",
    palette: {
      canvas: "#060D09",
      deep: "#0A140E",
      surface: "#0E1C14",
      card: "#13261B",
      cardHover: "#193224",
      border: "#234632",
      borderLight: "#34694B",
      textPrimary: "#E2FFEE",
      textMuted: "#7FA890",
      accentPrimary: "#00FF66",
      accentTension: "#FF9900",
      focusText: "#E2FFEE",
    },
  },
  {
    id: "halloween",
    name: "All Hallows (Ember & Nightshade)",
    shortName: "All Hallows",
    emoji: "🎃",
    archetype: "osl",
    description: "Bruised nightshade & cursed slate illuminated by jack-o'-lantern ember OSL and eldritch violet",
    palette: {
      canvas: "#0B0711",
      deep: "#100A18",
      surface: "#150E20",
      card: "#1C132B",
      cardHover: "#251938",
      border: "#36234F",
      borderLight: "#523576",
      textPrimary: "#F7E8D8",
      textMuted: "#9E8AA8",
      accentPrimary: "#FF6B1A",
      accentTension: "#B56BFF",
      focusText: "#FFF3E0",
    },
  },
];

const THEME_STORAGE_KEY = "jlight_app_theme";
const DEFAULT_THEME: AppTheme = "mocha";

/**
 * Resolves any raw or legacy theme string (e.g. 'milky-way') into a valid AppTheme.
 */
export function resolveTheme(raw?: string | null): AppTheme {
  if (!raw) return DEFAULT_THEME;
  if (raw === "milky-way") return "mocha";
  const match = THEME_OPTIONS.find((t) => t.id === raw);
  return match ? match.id : DEFAULT_THEME;
}

/**
 * Returns the full ThemeOption definition for a given theme ID.
 */
export function getThemeOption(theme?: AppTheme | string | null): ThemeOption {
  const resolved = resolveTheme(theme);
  return THEME_OPTIONS.find((t) => t.id === resolved) || THEME_OPTIONS[0];
}

/**
 * Gets the currently active theme from localStorage or defaults to 'mocha'.
 */
export function getSavedTheme(): AppTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return resolveTheme(saved);
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Saves and applies the theme and archetype to the <html> tag and notifies listeners.
 */
export function applyTheme(theme: AppTheme | string) {
  const option = getThemeOption(theme);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, option.id);
    document.documentElement.setAttribute("data-theme", option.id);
    document.documentElement.setAttribute("data-archetype", option.archetype);
    if (option.isLight) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    window.dispatchEvent(new CustomEvent("jlight-theme-change", { detail: option.id }));
  } catch (e) {
    console.error("Failed to persist theme:", e);
  }
}

/**
 * React hook that tracks the active AppTheme and re-renders on theme changes.
 */
export function useActiveTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => {
    const sync = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      setTheme(attr ? resolveTheme(attr) : getSavedTheme());
    };
    sync();

    const handleCustom = (e: Event) => {
      const custom = e as CustomEvent<AppTheme>;
      if (custom.detail) {
        setTheme(resolveTheme(custom.detail));
      } else {
        sync();
      }
    };

    window.addEventListener("jlight-theme-change", handleCustom);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("jlight-theme-change", handleCustom);
      observer.disconnect();
    };
  }, []);

  return theme;
}

// ============================================================================
// HUE-PRESERVING SEMANTIC MEMBER COLOR ADAPTATION
// Keeps each family member's chosen color hue (e.g. "green stays green",
// "pink stays pink") while harmonizing saturation, value, and Mother-Color
// undertone to match the active theme's materiality (Creamy PBT vs OSL vs Latte).
// ============================================================================

function parseHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if ([r, g, b].some(isNaN)) return null;
    return [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if ([r, g, b].some(isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(1, Math.min(254, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Adapts a member or family hex color to the active theme's aesthetic rules
 * while preserving the user's semantic hue (e.g. Green stays Green, Pink stays Pink).
 *
 * - Creamy Dark (Mocha, Matcha, Oat): Matte PBT pastel dye with warm cream/mother-color glaze.
 * - Creamy Light (Latte): Rich ceramic/fountain-pen ink dye for high readability on crema tiles.
 * - Cyberpunk / All Hallows OSL: High-luminance fluorescent OSL edge pigment.
 */
export function adaptMemberColor(
  rawHex: string | null | undefined,
  themeInput?: AppTheme | string | null
): string {
  const fallback = "#CBA6F7";
  if (!rawHex) return fallback;

  const rgb = parseHexToRgb(rawHex);
  if (!rgb) return rawHex;

  const option = getThemeOption(themeInput ?? (typeof window !== "undefined" ? document.documentElement.getAttribute("data-theme") : DEFAULT_THEME));
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

  let targetS = s;
  let targetL = l;

  if (option.archetype === "creamy") {
    if (option.isLight) {
      // Latte (Daylight): Rich ceramic dye — pull lightness into 40-48% so it never washes out on #EFF1F5
      targetS = Math.max(58, Math.min(78, s * 0.92));
      targetL = Math.max(38, Math.min(48, l * 0.78));
    } else {
      // Mocha / Matcha / Oat: Matte PBT Keycap Pastel — soft saturation (52-68%), elevated creamy lightness (74-81%)
      targetS = Math.max(48, Math.min(68, s * 0.78));
      targetL = Math.max(73, Math.min(81, l + (80 - l) * 0.55));
    }
  } else {
    // Archetype B (Cyberpunk & All Hallows OSL): Fluorescent pigment — high saturation (86-96%), luminous 60-68%
    targetS = Math.max(84, Math.min(96, s * 1.12));
    targetL = Math.max(58, Math.min(67, l + (63 - l) * 0.45));
  }

  const adjustedRgb = hslToRgb(h, targetS, targetL);

  // Mix 8% of the theme's primary text / Mother Color undertone so all member colors share the same atmosphere
  const motherTint = parseHexToRgb(
    option.archetype === "creamy" && !option.isLight
      ? option.palette.textPrimary
      : option.palette.accentPrimary
  ) || [205, 214, 244];

  const mixWeight = option.archetype === "creamy" ? 0.1 : 0.06;
  const finalR = adjustedRgb[0] * (1 - mixWeight) + motherTint[0] * mixWeight;
  const finalG = adjustedRgb[1] * (1 - mixWeight) + motherTint[1] * mixWeight;
  const finalB = adjustedRgb[2] * (1 - mixWeight) + motherTint[2] * mixWeight;

  return rgbToHex(finalR, finalG, finalB);
}
