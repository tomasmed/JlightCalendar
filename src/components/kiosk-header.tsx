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
  Sparkles,
  ChevronDown,
  Home,
} from "lucide-react";

export type AccessMode = "admin" | "standard" | "kid";
export type ActiveTab = "calendar" | "chores" | "meals" | "lists" | "photos";

interface KioskHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  accessMode: AccessMode;
  onOpenModeModal: () => void;
  onToggleSleep: () => void;
}

export function KioskHeader({
  activeTab,
  onTabChange,
  accessMode,
  onOpenModeModal,
  onToggleSleep,
}: KioskHeaderProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [household, setHousehold] = useState("The Family");
  const [showHouseholdMenu, setShowHouseholdMenu] = useState(false);

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

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

  return (
    <header className="h-20 bg-cosmos-deep/95 border-b border-cosmos-border px-6 flex items-center justify-between select-none backdrop-blur-xl relative z-40">
      {/* Left: Clock, Date & Weather with Starlight Glow */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-starlight tabular-nums drop-shadow-sm">
            {time || "--:--"}
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            {date || "Loading..."}
          </span>
        </div>

        {/* Multi-Household Switcher (FEAT-101 / FEAT-102) */}
        <div className="relative">
          <button
            onClick={() => setShowHouseholdMenu(!showHouseholdMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cosmos-surface border border-cosmos-border hover:border-purple-500/50 transition text-xs font-bold text-slate-200"
          >
            <Home className="w-3.5 h-3.5 text-starlight" />
            <span>{household}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showHouseholdMenu && (
            <div className="absolute top-12 left-0 w-56 bg-cosmos-card border border-cosmos-borderLight rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1 block">
                Switch Household
              </span>
              <button
                onClick={() => {
                  setHousehold("The Family");
                  setShowHouseholdMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                  household === "The Family"
                    ? "bg-purple-600/30 text-white border border-purple-500/40"
                    : "text-slate-300 hover:bg-cosmos-surface"
                }`}
              >
                <span>The Family (Home)</span>
                {household === "The Family" && (
                  <Sparkles className="w-3.5 h-3.5 text-starlight" />
                )}
              </button>
              <button
                onClick={() => {
                  setHousehold("Grandparents & Co.");
                  setShowHouseholdMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between mt-1 ${
                  household === "Grandparents & Co."
                    ? "bg-purple-600/30 text-white border border-purple-500/40"
                    : "text-slate-300 hover:bg-cosmos-surface"
                }`}
              >
                <span>Grandparents & Co.</span>
                {household === "Grandparents & Co." && (
                  <Sparkles className="w-3.5 h-3.5 text-starlight" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Ambient Weather */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cosmos-surface/80 border border-cosmos-border text-slate-300 text-sm">
          <CloudSun className="w-4 h-4 text-starlight" />
          <span className="font-bold text-white text-xs">72°F</span>
          <span className="text-[11px] text-slate-400">Clear Night</span>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-cosmos-void/80 p-1.5 rounded-2xl border border-cosmos-border">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 ${
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

      {/* Right: Mode Badge & Sleep Mode Button */}
      <div className="flex items-center gap-3">
        {/* Night Sleep Button */}
        <button
          onClick={onToggleSleep}
          title="Night Sleep Mode (OLED Protection)"
          className="p-3 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-starlight border border-cosmos-border transition"
        >
          <Moon className="w-4 h-4" />
        </button>

        {/* 3-Tier Access Mode Trigger */}
        <button
          onClick={onOpenModeModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            accessMode === "admin"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20"
              : accessMode === "kid"
              ? "bg-purple-500/10 text-purple-300 border-purple-500/40 hover:bg-purple-500/20 shadow-sm shadow-purple-500/20"
              : "bg-blue-500/10 text-starlight-cyan border-cyan-500/40 hover:bg-cyan-500/20 shadow-sm shadow-cyan-500/20"
          }`}
        >
          {accessMode === "admin" && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
          {accessMode === "standard" && <User className="w-3.5 h-3.5 text-starlight-cyan" />}
          {accessMode === "kid" && <Baby className="w-3.5 h-3.5 text-purple-400" />}
          <span>{accessMode} Mode</span>
        </button>
      </div>
    </header>
  );
}
