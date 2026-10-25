"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckSquare,
  Utensils,
  ListTodo,
  Image as ImageIcon,
  Shield,
  User,
  Baby,
  Moon,
  CloudSun,
  Sun,
  CloudRain,
  Snowflake,
  CloudLightning,
  Cloud,
  Sparkles,
  ChevronDown,
  Globe2,
  Plus,
  Users,
  LogIn,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  Info,
  Palette,
  Bot,
  Download,
  X,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { ChangelogModal } from "./changelog-modal";
import {
  applyTheme,
  AppTheme,
  THEME_OPTIONS,
  getThemeOption,
  useActiveTheme,
} from "@/lib/theme";

export type AccessMode = "admin" | "standard" | "kid";
export type ActiveTab = "calendar" | "chores" | "meals" | "lists" | "photos";

export interface GalaxyItem {
  id: string;
  name: string;
  slug?: string | null;
  theme: string;
  icon: string;
  familyColor?: string | null;
  familyAvatar?: string | null;
  joinCode?: string | null;
  isEphemeral?: boolean | null;
  expiresAt?: string | null;
  members?: { id: string; displayName: string; avatarIcon: string; role: string }[];
  calendars?: { id: string; name: string; isPrimary: boolean }[];
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  city: string;
  lat: number;
  lon: number;
}

interface KioskHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  accessMode: AccessMode;
  onOpenModeModal: () => void;
  onToggleSleep: () => void;
  galaxies?: GalaxyItem[];
  activeGalaxyId?: string;
  onSelectGalaxy?: (id: string) => void;
  onOpenInhabitantsModal?: () => void;
  onOpenCreateGalaxyModal?: () => void;
  onOpenJoinGalaxyModal?: () => void;
  onOpenAgentWallModal?: () => void;
  onOpenExportModal?: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function KioskHeader({
  activeTab,
  onTabChange,
  accessMode,
  onOpenModeModal,
  onToggleSleep,
  galaxies = [],
  activeGalaxyId,
  onSelectGalaxy,
  onOpenInhabitantsModal,
  onOpenCreateGalaxyModal,
  onOpenJoinGalaxyModal,
  onOpenAgentWallModal,
  onOpenExportModal,
  user,
}: KioskHeaderProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [showGalaxyMenu, setShowGalaxyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const currentTheme = useActiveTheme();
  const activeThemeOption = getThemeOption(currentTheme);

  useEffect(() => {
    if (!showThemeMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowThemeMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showThemeMenu]);

  const handleSelectTheme = (nextTheme: AppTheme) => {
    applyTheme(nextTheme);
    setShowThemeMenu(false);
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real-time weather via Open-Meteo & IP Geolocation
  useEffect(() => {
    let isMounted = true;

    async function fetchWeather() {
      try {
        let lat = 40.7128;
        let lon = -74.006;
        let city = "New York";

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const ipRes = await fetch("https://ipapi.co/json/", {
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.latitude && ipData.longitude) {
              lat = ipData.latitude;
              lon = ipData.longitude;
              city = ipData.city || city;
            }
          }
        } catch {
          // Fallback
        }

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit`
        );

        if (weatherRes.ok) {
          const data = await weatherRes.json();
          const temp = Math.round(data.current?.temperature_2m ?? 72);
          const code = data.current?.weather_code ?? 0;
          const isDay = data.current?.is_day === 1;

          let condition = "Clear";
          let icon = isDay ? "sun" : "moon";

          if (code === 0) {
            condition = isDay ? "Sunny" : "Clear Night";
            icon = isDay ? "sun" : "moon";
          } else if (code <= 3) {
            condition = "Partly Cloudy";
            icon = "cloud-sun";
          } else if (code <= 48) {
            condition = "Foggy";
            icon = "cloud";
          } else if (code <= 67 || (code >= 80 && code <= 82)) {
            condition = "Rain";
            icon = "cloud-rain";
          } else if (code <= 77 || (code >= 85 && code <= 86)) {
            condition = "Snow";
            icon = "snowflake";
          } else if (code >= 95) {
            condition = "Thunderstorm";
            icon = "cloud-lightning";
          }

          if (isMounted) {
            setWeather({ temp, condition, icon, city, lat, lon });
          }
        }
      } catch (err) {
        console.error("Failed to load weather:", err);
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const openWeatherCom = () => {
    const url = weather
      ? `https://weather.com/weather/today/l/${weather.lat},${weather.lon}`
      : "https://weather.com";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderWeatherIcon = () => {
    const iconType = weather?.icon || "cloud-sun";
    switch (iconType) {
      case "sun":
        return <Sun className="w-3.5 h-3.5 text-starlight-tension" />;
      case "moon":
        return <Moon className="w-3.5 h-3.5 text-starlight" />;
      case "cloud-rain":
        return <CloudRain className="w-3.5 h-3.5 text-starlight" />;
      case "snowflake":
        return <Snowflake className="w-3.5 h-3.5 text-starlight" />;
      case "cloud-lightning":
        return <CloudLightning className="w-3.5 h-3.5 text-starlight-tension" />;
      case "cloud":
        return <Cloud className="w-3.5 h-3.5 text-cosmos-muted" />;
      default:
        return <CloudSun className="w-3.5 h-3.5 text-starlight" />;
    }
  };

  const activeGalaxy =
    galaxies.find((g) => g.id === activeGalaxyId) ||
    galaxies[0] || {
      id: "default",
      name: "The Family Galaxy",
      theme: "mocha",
      icon: "sparkles",
      joinCode: "GLX-HOME",
    };

  const allTabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

  const tabs = activeGalaxy.isEphemeral
    ? allTabs.filter((t) => t.id === "calendar" || t.id === "lists")
    : allTabs;

  const creamyThemes = THEME_OPTIONS.filter((t) => t.archetype === "creamy");
  const oslThemes = THEME_OPTIONS.filter((t) => t.archetype === "osl");

  const handleCopyJoinCode = () => {
    if (activeGalaxy?.joinCode) {
      navigator.clipboard.writeText(activeGalaxy.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const renderThemeMenuContent = () => (
    <>
      <div className="px-2 pb-2 border-b border-cosmos-border flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-cosmos-text block">
            Theme Studio
          </span>
          <span className="text-[10px] text-cosmos-muted font-mono">
            Per-device atmosphere & materiality
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cosmos-surface text-starlight font-bold border border-cosmos-border">
            {activeThemeOption.archetype === "creamy" ? "Matte PBT" : "Cyber OSL"}
          </span>
          <button
            type="button"
            onClick={() => setShowThemeMenu(false)}
            aria-label="Close Theme Studio"
            className="p-1 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Archetype A: Super Creamy */}
      <div className="mt-2.5">
        <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-cosmos-muted">
          <span>Archetype A // Super Creamy</span>
          <span>Matte PBT</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {creamyThemes.map((t) => {
            const isSelected = t.id === currentTheme;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`theme-option-${t.id}`}
                onClick={() => handleSelectTheme(t.id)}
                className={`p-2 rounded-xl text-left transition flex flex-col justify-between gap-1.5 min-h-[60px] border ${
                  isSelected
                    ? "bg-cosmos-surface border-starlight shadow-sm"
                    : "bg-cosmos-deep/60 border-cosmos-border/70 hover:bg-cosmos-surface/70 hover:border-cosmos-borderLight"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold text-cosmos-text truncate">
                    {t.emoji} {t.shortName}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-starlight shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    t.palette.canvas,
                    t.palette.surface,
                    t.palette.accentPrimary,
                    t.palette.accentTension,
                  ].map((hex, i) => (
                    <span
                      key={i}
                      className="w-3.5 h-2 rounded-[2px] border border-black/20"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Archetype B: Cyberpunk & Seasonal OSL */}
      <div className="mt-3 pt-2.5 border-t border-cosmos-border/60">
        <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-cosmos-muted">
          <span>Archetype B // Fluorescent OSL</span>
          <span>Light-Spill</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {oslThemes.map((t) => {
            const isSelected = t.id === currentTheme;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`theme-option-${t.id}`}
                onClick={() => handleSelectTheme(t.id)}
                className={`p-2 rounded-xl text-left transition flex flex-col justify-between gap-1.5 min-h-[60px] border ${
                  isSelected
                    ? "bg-cosmos-surface border-starlight shadow-sm"
                    : "bg-cosmos-deep/60 border-cosmos-border/70 hover:bg-cosmos-surface/70 hover:border-cosmos-borderLight"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold text-cosmos-text truncate">
                    {t.emoji} {t.shortName}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-starlight shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    t.palette.canvas,
                    t.palette.surface,
                    t.palette.accentPrimary,
                    t.palette.accentTension,
                  ].map((hex, i) => (
                    <span
                      key={i}
                      className="w-3.5 h-2 rounded-[2px] border border-black/20"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <header
      data-testid="kiosk-header"
      className="h-auto md:h-20 border-b border-cosmos-border px-2.5 sm:px-4 md:px-4 lg:px-6 py-1.5 md:py-0 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0 select-none relative z-40 max-w-full"
    >
      <div className="absolute inset-0 bg-cosmos-deep/95 backdrop-blur-xl pointer-events-none -z-10" />
      {/* ROW 1 (Mobile) / LEFT (Desktop): Clock, Ambient Weather & Calendar Galaxy Switcher */}
      <div
        data-testid="kiosk-header-row-1"
        className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 sm:gap-3.5 shrink-0"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Time & Date (Hidden on <640px phones where the OS status bar clock is already visible) */}
          <div
            data-testid="kiosk-clock-display"
            className="hidden sm:flex flex-col leading-none shrink-0"
          >
            <span className="text-lg sm:text-2xl font-black tracking-tight text-cosmos-text tabular-nums">
              {time || "--:--"}
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-cosmos-muted mt-0.5">
              {date || "Loading..."}
            </span>
          </div>

          {/* Ambient Weather Readout (Critique 4.1: sits directly on canvas without bordered pill cage) */}
          <button
            onClick={openWeatherCom}
            title="Click to view forecast on Weather.com"
            className="flex md:hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60 transition group cursor-pointer min-h-[38px] md:min-h-[44px] min-w-0 shrink-0"
          >
            {renderWeatherIcon()}
            <span className="font-bold text-cosmos-text text-xs tabular-nums">
              {weather ? `${weather.temp}°F` : "72°F"}
            </span>
            <span className="text-[10px] text-cosmos-muted sm:inline">
              {weather ? weather.condition : "Clear"}
            </span>
            <ExternalLink className="w-3 h-3 text-cosmos-muted/70 group-hover:text-starlight transition hidden sm:inline" />
          </button>
        </div>

        {/* Galaxy Switcher Dropdown (Primary Interactive Selector — keeps tactile container) */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setShowGalaxyMenu(!showGalaxyMenu);
              setShowThemeMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cosmos-surface border border-cosmos-border hover:border-cosmos-borderLight transition font-bold text-xs text-cosmos-text min-h-[44px]"
            title="Switch Galaxy Orbit"
          >
            <div className="p-1 rounded-lg bg-cosmos-card text-starlight shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left max-w-[130px] sm:max-w-[160px] md:max-w-[140px] truncate">
              <span className="text-[8px] font-black uppercase tracking-widest text-starlight leading-none">
                {activeGalaxy.isEphemeral ? "☄️ Comet" : "Galaxy"}
              </span>
              <span className="truncate text-cosmos-text text-xs font-bold">
                {activeGalaxy.name}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-cosmos-muted shrink-0" />
          </button>

          {showGalaxyMenu && (
            <div className="absolute top-12 right-0 md:left-0 md:right-auto w-72 sm:w-80 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-cosmos-border/60 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-cosmos-muted uppercase tracking-wider">
                  Your Galaxies
                </span>
                <span className="text-[10px] text-starlight font-bold">
                  {galaxies.length} Connected
                </span>
              </div>

              {/* Active Galaxy Join Code Banner */}
              {activeGalaxy.joinCode && (
                <div className="my-2 p-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-cosmos-muted block">
                      Galaxy Join Code
                    </span>
                    <span className="font-mono text-xs font-black text-starlight tracking-wider">
                      {activeGalaxy.joinCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyJoinCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cosmos-card hover:bg-cosmos-cardHover text-starlight text-[10px] font-bold border border-cosmos-border transition"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Galaxy List */}
              <div className="py-1 max-h-52 overflow-y-auto space-y-1">
                {galaxies.map((g) => {
                  const isSelected = g.id === activeGalaxy.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectGalaxy?.(g.id);
                        setShowGalaxyMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                        isSelected
                          ? "bg-cosmos-surface text-cosmos-text border border-cosmos-borderLight shadow-sm"
                          : "text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Globe2 className="w-4 h-4 text-starlight flex-shrink-0" />
                        <div className="truncate">
                          <span className="block truncate font-bold text-cosmos-text">
                            {g.name}
                          </span>
                          <span className="text-[10px] text-cosmos-muted font-normal">
                            {g.members
                              ? `${g.members.length} Inhabitants`
                              : "Active Orbit"}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Sparkles className="w-3.5 h-3.5 text-starlight flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons in Dropdown */}
              <div className="pt-2 mt-1 border-t border-cosmos-border/60 space-y-1">
                {onOpenJoinGalaxyModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenJoinGalaxyModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-cosmos-surface flex items-center gap-2 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-starlight" />
                    <span>Join Galaxy with Code</span>
                  </button>
                )}

                {accessMode !== "kid" && onOpenInhabitantsModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenInhabitantsModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface flex items-center gap-2 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-starlight" />
                    <span>People &amp; Group Colors</span>
                  </button>
                )}

                {accessMode !== "kid" && onOpenAgentWallModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenAgentWallModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface flex items-center gap-2 transition"
                  >
                    <Bot className="w-3.5 h-3.5 text-starlight-tension" />
                    <span>Manage Agents & Bot Wall</span>
                  </button>
                )}

                {(!!user || accessMode === "admin") &&
                  accessMode !== "kid" &&
                  onOpenCreateGalaxyModal && (
                    <button
                      onClick={() => {
                        setShowGalaxyMenu(false);
                        onOpenCreateGalaxyModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-cosmos-surface flex items-center gap-2 transition cursor-pointer min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Orbit New Galaxy</span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Navigation Tabs (Critique 4.2: Unified Active Focus via .theme-focus-pill) */}
      <nav className="hidden md:flex items-center gap-1 bg-cosmos-void/80 p-1 rounded-xl border border-cosmos-border shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isKidRestricted =
            accessMode === "kid" && (tab.id === "meals" || tab.id === "lists");

          if (isKidRestricted) return null;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs tracking-wide transition-all duration-150 min-h-[42px] ${
                isActive
                  ? "theme-focus-pill font-extrabold"
                  : "text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/70"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ROW 2 (Mobile) / RIGHT (Desktop): Ambient Utilities, Theme Studio, Profile & Access Mode */}
      <div
        data-testid="kiosk-header-row-2"
        className="w-full md:w-auto flex items-center justify-between md:justify-end gap-1 sm:gap-2 pt-1.5 md:pt-0 border-t border-cosmos-border/50 md:border-t-0 shrink-0"
      >
        {/* Left group on Mobile Row 2: User Profile/Login */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 md:contents">
          {/* User OAuth Profile or Sign In Button */}
          <div className="order-2 md:order-1 shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowGalaxyMenu(false);
                    setShowThemeMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-cosmos-surface/70 transition min-h-[44px]"
                  title={`Logged in as ${user.name || user.email}`}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="w-6 h-6 rounded-full border border-cosmos-borderLight shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-cosmos-card border border-cosmos-borderLight flex items-center justify-center text-[10px] font-bold text-starlight shrink-0">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="text-xs font-bold text-cosmos-text truncate max-w-[75px] sm:max-w-[110px]">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-cosmos-muted shrink-0" />
                </button>

                {showUserMenu && (
                  <div className="absolute top-12 left-0 md:right-0 md:left-auto w-56 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-cosmos-border/60">
                      <span className="text-xs font-bold text-cosmos-text block truncate">
                        {user.name || "User"}
                      </span>
                      <span className="text-[10px] text-cosmos-muted block truncate">
                        {user.email}
                      </span>
                    </div>
                    {accessMode !== "kid" && onOpenCreateGalaxyModal && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenCreateGalaxyModal();
                        }}
                        className="w-full text-left mt-1 px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-cosmos-surface flex items-center gap-2 transition cursor-pointer min-h-[44px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-starlight" />
                        <span>+ Create New Galaxy</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full text-left mt-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition min-h-[44px] cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-cosmos-text transition min-h-[44px]"
                title="Sign in with Google OAuth"
              >
                <LogIn className="w-3.5 h-3.5 text-starlight shrink-0" />
                <span className="hidden sm:inline">Google Login</span>
                <span className="sm:hidden text-xs">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Right group on Mobile Row 2: Ambient Quick Utilities (Critique 4.1: Borderless canvas buttons) */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 md:contents">
          {/* Theme Studio Picker Dropdown */}
          <div className="relative md:order-2 shrink-0">
            <button
              data-testid="theme-picker-button"
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowGalaxyMenu(false);
                setShowUserMenu(false);
              }}
              title={`Active Theme: ${activeThemeOption.name}. Click to switch palette.`}
              aria-label="Open Theme Studio palette selector"
              className="px-2.5 py-2 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60 transition min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span className="text-sm leading-none select-none" role="img" aria-hidden="true">
                {activeThemeOption.emoji}
              </span>
              <span className="hidden xl:inline text-[11px] font-mono font-bold text-cosmos-muted">
                {activeThemeOption.shortName}
              </span>
              <Palette className="w-3.5 h-3.5 text-starlight xl:hidden" />
            </button>

            {showThemeMenu && (
              <>
                {/* Mobile Full-Screen Modal Overlay */}
                <div
                  data-testid="theme-picker-backdrop"
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 md:hidden flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
                  onClick={() => setShowThemeMenu(false)}
                >
                  <div
                    data-testid="theme-picker-menu"
                    className="w-full max-w-sm sm:max-w-md my-auto bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-3 max-h-[85vh] overflow-y-auto animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderThemeMenuContent()}
                  </div>
                </div>

                {/* Desktop Dropdown */}
                <div
                  data-testid="theme-picker-menu"
                  className="hidden md:block absolute top-12 right-0 w-80 lg:w-96 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 max-h-[82vh] overflow-y-auto"
                >
                  {renderThemeMenuContent()}
                </div>
              </>
            )}
          </div>

          {/* Export .ics Calendar Portability Button */}
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              title="Export Date Window to .ics (Google / Apple Calendar)"
              aria-label="Export calendar events to .ics"
              className="md:order-3 px-2.5 py-2 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60 transition min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="hidden xl:inline text-[11px] font-bold">
                Export .ics
              </span>
            </button>
          )}

          {/* What's New Changelog Info Button (Ambient borderless utility) */}
          <button
            onClick={() => setIsChangelogOpen(true)}
            title="What's New / Latest Changelog"
            aria-label="Open latest updates and changelog"
            className="md:order-3 p-2 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Night Sleep Button (Hidden for Ephemeral Comets) */}
          {!activeGalaxy.isEphemeral && (
            <button
              onClick={onToggleSleep}
              title="Night Sleep Mode (OLED Protection)"
              className="md:order-4 p-2 rounded-lg text-cosmos-muted hover:text-cosmos-text hover:bg-cosmos-surface/60 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            >
              <Moon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </header>
  );
}
