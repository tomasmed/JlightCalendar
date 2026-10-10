export type AppTheme = "halloween" | "milky-way";

export interface ThemeOption {
  id: AppTheme;
  name: string;
  icon: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "halloween",
    name: "Spooky Halloween 🎃",
    icon: "Ghost",
    description: "Deep midnight, glowing pumpkin embers, and ghostly purple nebulas",
  },
  {
    id: "milky-way",
    name: "Cosmic Milky Way 🌌",
    icon: "Sparkles",
    description: "Deep cosmic void with celestial starlight and nebula dust",
  },
];

const THEME_STORAGE_KEY = "jlight_app_theme";

/**
 * Gets the currently active theme from localStorage or defaults to 'halloween'.
 */
export function getSavedTheme(): AppTheme {
  if (typeof window === "undefined") return "halloween";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    if (saved === "halloween" || saved === "milky-way") {
      return saved;
    }
  } catch (e) {
    // localStorage may be disabled
  }
  return "halloween"; // Defaulted in for now as requested
}

/**
 * Saves and applies the theme to the <html> tag.
 */
export function applyTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    console.error("Failed to persist theme:", e);
  }
}
