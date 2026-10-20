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
  Ghost,
  Bot,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { ChangelogModal } from "./changelog-modal";
import { getSavedTheme, applyTheme, AppTheme } from "@/lib/theme";

export type AccessMode = "admin" | "standard" | "kid";
export type ActiveTab = "calendar" | "chores" | "meals" | "lists" | "photos";

export interface GalaxyItem {
  id: string;
  name: string;
  theme: string;
  icon: string;
  familyColor?: string | null;
  familyAvatar?: string | null;
  joinCode?: string | null;
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
  user,
}: KioskHeaderProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [showGalaxyMenu, setShowGalaxyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>("halloween");

  useEffect(() => {
    setCurrentTheme(getSavedTheme());
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: AppTheme = currentTheme === "halloween" ? "milky-way" : "halloween";
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
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
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case "moon":
        return <Moon className="w-3.5 h-3.5 text-indigo-300" />;
      case "cloud-rain":
        return <CloudRain className="w-3.5 h-3.5 text-cyan-400" />;
      case "snowflake":
        return <Snowflake className="w-3.5 h-3.5 text-blue-200" />;
      case "cloud-lightning":
        return <CloudLightning className="w-3.5 h-3.5 text-yellow-400" />;
      case "cloud":
        return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
      default:
        return <CloudSun className="w-3.5 h-3.5 text-starlight" />;
    }
  };

  const activeGalaxy =
    galaxies.find((g) => g.id === activeGalaxyId) ||
    galaxies[0] || {
      id: "default",
      name: "The Family Galaxy",
      theme: "milky-way",
      icon: "sparkles",
      joinCode: "GLX-HOME",
    };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

  const handleCopyJoinCode = () => {
    if (activeGalaxy?.joinCode) {
      navigator.clipboard.writeText(activeGalaxy.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <header
      data-testid="kiosk-header"
      className="h-auto md:h-20 bg-cosmos-deep/95 border-b border-cosmos-border px-2.5 sm:px-4 md:px-4 lg:px-6 py-1.5 md:py-0 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0 select-none backdrop-blur-xl relative z-40 max-w-full"
    >
      {/* ROW 1 (Mobile) / LEFT (Desktop): Clock (tablet/kiosk), Weather & Calendar Galaxy Switcher */}
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
            <span
              className={`text-lg sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-starlight tabular-nums drop-shadow-sm ${
                currentTheme === "halloween" ? "font-halloween tracking-wider text-xl sm:text-3xl" : ""
              }`}
            >
              {time || "--:--"}
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5 ${
                currentTheme === "halloween" ? "text-orange-400/90 font-bold" : ""
              }`}
            >
              {date || "Loading..."}
            </span>
          </div>

          {/* Ambient Real Weather Pill (Compact on mobile Row 1, full on lg+ desktop) */}
          <button
            onClick={openWeatherCom}
            title="Click to view forecast on Weather.com"
            className="flex md:hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cosmos-surface/80 border border-cosmos-border text-slate-300 hover:border-purple-500/60 hover:bg-cosmos-cardHover transition group cursor-pointer min-h-[38px] md:min-h-[44px] min-w-0 shrink-0"
          >
            {renderWeatherIcon()}
            <span className="font-bold text-white text-xs">
              {weather ? `${weather.temp}°F` : "72°F"}
            </span>
            <span className="text-[10px] text-slate-400 sm:inline">
              {weather ? weather.condition : "Clear"}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-starlight transition hidden sm:inline" />
          </button>
        </div>

        {/* Galaxy Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowGalaxyMenu(!showGalaxyMenu)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-cosmos-surface border border-cosmos-border hover:border-purple-500/50 transition font-bold text-xs text-slate-200 shadow-md min-h-[44px]"
            title="Switch Galaxy Orbit"
          >
            <div className="p-1 rounded-lg bg-purple-600/30 text-starlight shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left max-w-[130px] sm:max-w-[160px] md:max-w-[140px] truncate">
              <span className="text-[8px] font-black uppercase tracking-widest text-starlight leading-none">
                Galaxy
              </span>
              <span className="truncate text-white text-xs font-bold">
                {activeGalaxy.name}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showGalaxyMenu && (
            <div className="absolute top-12 right-0 md:left-0 md:right-auto w-72 sm:w-80 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-cosmos-border/60 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Your Galaxies
                </span>
                <span className="text-[10px] text-starlight font-bold">
                  {galaxies.length} Connected
                </span>
              </div>

              {/* Active Galaxy Join Code Banner */}
              {activeGalaxy.joinCode && (
                <div className="my-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Galaxy Join Code
                    </span>
                    <span className="font-mono text-xs font-black text-starlight tracking-wider">
                      {activeGalaxy.joinCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyJoinCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-starlight text-[10px] font-bold border border-purple-500/40 transition"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
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
                          ? "bg-purple-600/30 text-white border border-purple-500/40 shadow-sm"
                          : "text-slate-300 hover:bg-cosmos-surface"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Globe2 className="w-4 h-4 text-starlight flex-shrink-0" />
                        <div className="truncate">
                          <span className="block truncate font-bold">{g.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {g.members ? `${g.members.length} Inhabitants` : "Active Orbit"}
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
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-starlight-cyan hover:bg-cyan-500/10 flex items-center gap-2 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-starlight-cyan" />
                    <span>Join Galaxy with Code</span>
                  </button>
                )}

                {accessMode !== "kid" && onOpenInhabitantsModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenInhabitantsModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-cosmos-surface flex items-center gap-2 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-starlight" />
                    <span>Manage Inhabitants & Pets</span>
                  </button>
                )}

                {accessMode !== "kid" && onOpenAgentWallModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenAgentWallModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 flex items-center gap-2 transition"
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
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
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-purple-600/20 flex items-center gap-2 transition cursor-pointer min-h-[44px]"
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

      {/* CENTER: Navigation Tabs (Visible on tablet & desktop, handled by MobileNavBar on mobile) */}
      <nav className="hidden md:flex items-center gap-1 bg-cosmos-void/80 p-1 rounded-2xl border border-cosmos-border shrink-0">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 min-h-[44px] ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-cosmos-surface/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ROW 2 (Mobile) / RIGHT (Desktop): Access Mode Badge, User Profile & Quick Action Buttons */}
      <div
        data-testid="kiosk-header-row-2"
        className="w-full md:w-auto flex items-center justify-between md:justify-end gap-1.5 sm:gap-2.5 pt-1.5 md:pt-0 border-t border-cosmos-border/50 md:border-t-0 shrink-0"
      >
        {/* Left group on Mobile Row 2: Access Mode Trigger & User Profile/Login */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 md:contents">
          {/* 3-Tier Access Mode Trigger (First on mobile Row 2, last on desktop) */}
          <button
            onClick={onOpenModeModal}
            className={`order-1 md:order-5 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all min-h-[44px] shrink-0 ${
              accessMode === "admin"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20"
                : accessMode === "kid"
                ? "bg-purple-500/10 text-purple-300 border-purple-500/40 hover:bg-purple-500/20"
                : "bg-blue-500/10 text-starlight-cyan border-cyan-500/40 hover:bg-cyan-500/20"
            }`}
          >
            {accessMode === "admin" && (
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            {accessMode === "standard" && (
              <User className="w-3.5 h-3.5 text-starlight-cyan shrink-0" />
            )}
            {accessMode === "kid" && (
              <Baby className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            )}
            <span>{accessMode} Mode</span>
          </button>

          {/* User OAuth Profile or Sign In Button */}
          <div className="order-2 md:order-1 shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border transition min-h-[44px]"
                  title={`Logged in as ${user.name || user.email}`}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="w-6 h-6 rounded-full border border-purple-400 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[75px] sm:max-w-[110px]">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {showUserMenu && (
                  <div className="absolute top-12 left-0 md:right-0 md:left-auto w-56 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-cosmos-border/60">
                      <span className="text-xs font-bold text-white block truncate">
                        {user.name || "User"}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {user.email}
                      </span>
                    </div>
                    {accessMode !== "kid" && onOpenCreateGalaxyModal && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenCreateGalaxyModal();
                        }}
                        className="w-full text-left mt-1 px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-purple-600/20 flex items-center gap-2 transition cursor-pointer min-h-[44px]"
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
                      className="w-full text-left mt-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition min-h-[44px] cursor-pointer"
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
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/40 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition min-h-[44px]"
                title="Sign in with Google OAuth"
              >
                <LogIn className="w-3.5 h-3.5 text-starlight shrink-0" />
                <span className="hidden sm:inline">Google Login</span>
                <span className="sm:hidden text-xs">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Right group on Mobile Row 2: Quick Utility Buttons (Theme, Changelog, Sleep) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 md:contents">
          {/* Theme Toggle Button (Halloween / Cosmic) */}
          <button
            onClick={handleToggleTheme}
            title={`Active Theme: ${currentTheme === "halloween" ? "Spooky Halloween 🎃" : "Cosmic Milky Way 🌌"}. Click to toggle.`}
            aria-label="Toggle Halloween and Cosmic themes"
            className="md:order-2 p-2 sm:p-2.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-300 hover:text-starlight border border-cosmos-border transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          >
            {currentTheme === "halloween" ? (
              <span className="text-base leading-none select-none" role="img" aria-label="Halloween">🎃</span>
            ) : (
              <Sparkles className="w-4 h-4 text-starlight" />
            )}
          </button>

          {/* What's New Changelog Info Button */}
          <button
            onClick={() => setIsChangelogOpen(true)}
            title="What's New / Latest Changelog"
            aria-label="Open latest updates and changelog"
            className="md:order-3 p-2 sm:p-2.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-300 hover:text-starlight border border-cosmos-border transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          >
            <Info className="w-4 h-4 text-starlight" />
          </button>

          {/* Night Sleep Button (OLED Protection) */}
          <button
            onClick={onToggleSleep}
            title="Night Sleep Mode (OLED Protection)"
            className="md:order-4 p-2 sm:p-2.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-starlight border border-cosmos-border transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          >
            <Moon className="w-4 h-4" />
          </button>
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
