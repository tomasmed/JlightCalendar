"use client";

import React, { useState } from "react";
import { KioskHeader, ActiveTab, AccessMode } from "@/components/kiosk-header";
import { CalendarView } from "@/components/calendar-view";
import { ChoresView } from "@/components/chores-view";
import { MealsView } from "@/components/meals-view";
import { ListsView } from "@/components/lists-view";
import { ScreensaverView } from "@/components/screensaver-view";
import { ModeSwitcherModal } from "@/components/mode-switcher-modal";
import { NightSleepOverlay } from "@/components/night-sleep-overlay";
import { MobileNavBar } from "@/components/mobile-nav-bar";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
  const [accessMode, setAccessMode] = useState<AccessMode>("standard");
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-cosmos-void text-slate-100 select-none">
      {/* 24/7 Night Sleep Mode Overlay */}
      <NightSleepOverlay
        isSleeping={isSleeping}
        onWake={() => setIsSleeping(false)}
      />

      {/* Access Mode Switcher (PIN Protected) */}
      <ModeSwitcherModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        currentMode={accessMode}
        onSelectMode={(mode) => setAccessMode(mode)}
      />

      {/* Screensaver Takes Over Whole Display */}
      {activeTab === "photos" ? (
        <ScreensaverView onDismiss={() => setActiveTab("calendar")} />
      ) : (
        <>
          {/* Top Kiosk Header */}
          <KioskHeader
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            accessMode={accessMode}
            onOpenModeModal={() => setIsModeModalOpen(true)}
            onToggleSleep={() => setIsSleeping(true)}
          />

          {/* Active View */}
          <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
            {activeTab === "calendar" && (
              <CalendarView accessMode={accessMode} />
            )}
            {activeTab === "chores" && <ChoresView accessMode={accessMode} />}
            {activeTab === "meals" && <MealsView accessMode={accessMode} />}
            {activeTab === "lists" && <ListsView accessMode={accessMode} />}
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <MobileNavBar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            accessMode={accessMode}
          />
        </>
      )}
    </main>
  );
}
