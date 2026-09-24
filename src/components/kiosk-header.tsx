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
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";

export type AccessMode = "admin" | "standard" | "kid";
export type ActiveTab = "calendar" | "chores" | "meals" | "lists" | "photos";

export interface GalaxyItem {
  id: string;
  name: string;
  theme: string;
  icon: string;
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
  onSelectGalaxy?: (galaxyId: string) => void;
  onOpenInhabitantsModal?: () => void;
  onOpenCreateGalaxyModal?: () => void;
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
  user,
}: KioskHeaderProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [showGalaxyMenu, setShowGalaxyMenu] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

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
        let lon = -74.0060;
        let city = "New York";

        // Attempt IP-based approximate location with timeout
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
          // Fallback to default NYC coordinates
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
        return <Sun className="w-4 h-4 text-amber-400" />;
      case "moon":
        return <Moon className="w-4 h-4 text-indigo-300" />;
      case "cloud-rain":
        return <CloudRain className="w-4 h-4 text-cyan-400" />;
      case "snowflake":
        return <Snowflake className="w-4 h-4 text-blue-200" />;
      case "cloud-lightning":
        return <CloudLightning className="w-4 h-4 text-yellow-400" />;
      case "cloud":
        return <Cloud className="w-4 h-4 text-slate-300" />;
      default:
        return <CloudSun className="w-4 h-4 text-starlight" />;
    }
  };

  const activeGalaxy =
    galaxies.find((g) => g.id === activeGalaxyId) ||
    galaxies[0] || {
      id: "default",
      name: "The Sol Family Galaxy",
      theme: "milky-way",
      icon: "sparkles",
    };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

  return (
    <header className="h-16 md:h-20 bg-cosmos-deep/95 border-b border-cosmos-border px-3 md:px-6 flex items-center justify-between select-none backdrop-blur-xl relative z-40">
      {/* Left: Clock, Date & Calendar Galaxy Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
        <div className="flex flex-col">
          <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-starlight tabular-nums drop-shadow-sm leading-tight">
            {time || "--:--"}
          </span>
          <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            {date || "Loading..."}
          </span>
        </div>

        {/* Multi-Galaxy Switcher Dropdown (Epic 1 / FEAT-101 / FEAT-102) */}
        <div className="relative">
          <button
            onClick={() => setShowGalaxyMenu(!showGalaxyMenu)}
            className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-cosmos-surface border border-cosmos-border hover:border-purple-500/50 transition font-bold text-xs text-slate-200 shadow-md min-h-[44px]"
            title="Switch Calendar Galaxy"
          >
            <div className="p-1 rounded-lg bg-purple-600/30 text-starlight">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-starlight leading-none mb-0.5 hidden sm:inline">
                Galaxy
              </span>
              <span className="truncate max-w-[100px] sm:max-w-[140px] text-white">
                {activeGalaxy.name}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showGalaxyMenu && (
            <div className="absolute top-12 left-0 w-72 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-cosmos-border/60 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Select Calendar Galaxy
                </span>
                <span className="text-[10px] text-starlight font-bold">
                  {galaxies.length} Galaxies
                </span>
              </div>

              <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                {galaxies.map((g) => {
                  const isSelected = g.id === activeGalaxy.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectGalaxy?.(g.id);
                        setShowGalaxyMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                        isSelected
                          ? "bg-purple-600/30 text-white border border-purple-500/40 shadow-sm"
                          : "text-slate-300 hover:bg-cosmos-surface"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Globe2 className="w-4 h-4 text-starlight flex-shrink-0" />
                        <div className="truncate">
                          <span className="block truncate">{g.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {g.members ? `${g.members.length} Inhabitants` : "Active Group"}
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

                {accessMode === "admin" && onOpenCreateGalaxyModal && (
                  <button
                    onClick={() => {
                      setShowGalaxyMenu(false);
                      onOpenCreateGalaxyModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-starlight hover:bg-purple-600/20 flex items-center gap-2 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Orbit New Galaxy</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ambient Real Weather Pill (Redirects to Weather.com on click) */}
        <button
          onClick={openWeatherCom}
          title="Click to view detailed forecast on Weather.com"
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-cosmos-surface/80 border border-cosmos-border text-slate-300 hover:border-purple-500/60 hover:bg-cosmos-cardHover transition group cursor-pointer min-h-[44px]"
        >
          {renderWeatherIcon()}
          <span className="font-bold text-white text-xs">
            {weather ? `${weather.temp}°F` : "72°F"}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {weather ? weather.condition : "Clear"}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-starlight transition hidden sm:inline" />
        </button>
      </div>

      {/* Center: Navigation Tabs (Visible on tablet & desktop, handled by MobileNavBar on mobile) */}
      <nav className="hidden md:flex items-center gap-1.5 bg-cosmos-void/80 p-1.5 rounded-2xl border border-cosmos-border">
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
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 min-h-[44px] ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-cosmos-surface/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: User OAuth Profile, Mode Badge & Sleep Mode Button */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Google OAuth Profile / Sign In */}
        {user ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cosmos-surface border border-cosmos-border">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-6 h-6 rounded-full border border-purple-400"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
              {user.name || user.email?.split("@")[0]}
            </span>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border hover:border-purple-500/40 text-xs font-bold text-slate-200 transition min-h-[44px]"
          >
            <LogIn className="w-3.5 h-3.5 text-starlight" />
            <span>Google Login</span>
          </button>
        )}

        {/* Night Sleep Button */}
        <button
          onClick={onToggleSleep}
          title="Night Sleep Mode (OLED Protection)"
          className="p-2 md:p-3 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-starlight border border-cosmos-border transition min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <Moon className="w-4 h-4" />
        </button>

        {/* 3-Tier Access Mode Trigger */}
        <button
          onClick={onOpenModeModal}
          className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-wider border transition-all min-h-[48px] ${
            accessMode === "admin"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20"
              : accessMode === "kid"
              ? "bg-purple-500/10 text-purple-300 border-purple-500/40 hover:bg-purple-500/20 shadow-sm shadow-purple-500/20"
              : "bg-blue-500/10 text-starlight-cyan border-cyan-500/40 hover:bg-cyan-500/20 shadow-sm shadow-cyan-500/20"
          }`}
        >
          {accessMode === "admin" && (
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {accessMode === "standard" && (
            <User className="w-3.5 h-3.5 text-starlight-cyan" />
          )}
          {accessMode === "kid" && (
            <Baby className="w-3.5 h-3.5 text-purple-400" />
          )}
          <span className="hidden sm:inline">{accessMode} Mode</span>
        </button>
      </div>
    </header>
  );
}
