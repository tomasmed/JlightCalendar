"use client";

import React from "react";
import {
  Calendar,
  CheckSquare,
  Utensils,
  ListTodo,
  Image as ImageIcon,
} from "lucide-react";
import { ActiveTab, AccessMode } from "./kiosk-header";

interface MobileNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  accessMode: AccessMode;
  isEphemeral?: boolean;
}

export function MobileNavBar({
  activeTab,
  onTabChange,
  accessMode,
  isEphemeral = false,
}: MobileNavBarProps) {
  const allTabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chores", label: "Chores", icon: CheckSquare },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "lists", label: "Lists", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
  ];

  const tabs = isEphemeral
    ? allTabs.filter((t) => t.id === "calendar" || t.id === "lists")
    : allTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 min-h-16 pb-[env(safe-area-inset-bottom,0px)] bg-cosmos-deep/95 border-t border-cosmos-border/80 backdrop-blur-xl z-40 px-2 py-1 flex items-center justify-around select-none">
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
            className={`min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition-all ${
              isActive
                ? "text-starlight font-bold"
                : "text-cosmos-muted hover:text-cosmos-text"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all ${
                isActive ? "theme-focus-pill" : ""
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
