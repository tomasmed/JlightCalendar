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
  Sun,
  CloudSun,
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
    <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between select-none">
      {/* Left: Clock & Weather */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-3xl font-extrabold tracking-tight text-white tabular-nums">
            {time || "--:--"}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {date || "Loading..."}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-sm">
          <CloudSun className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-white">72°F</span>
          <span className="text-xs text-slate-400">Sunny</span>
        </div>
      </div>

      {/* Center: Navigation Tabs (Disabled in Kid mode except Calendar & Chores) */}
      <nav className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
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
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border border-slate-700/60 transition"
        >
          <Moon className="w-5 h-5" />
        </button>

        {/* 3-Tier Access Mode Trigger */}
        <button
          onClick={onOpenModeModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
            accessMode === "admin"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              : accessMode === "kid"
              ? "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
              : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
          }`}
        >
          {accessMode === "admin" && <Shield className="w-4 h-4" />}
          {accessMode === "standard" && <User className="w-4 h-4" />}
          {accessMode === "kid" && <Baby className="w-4 h-4" />}
          <span>{accessMode} Mode</span>
        </button>
      </div>
    </header>
  );
}
