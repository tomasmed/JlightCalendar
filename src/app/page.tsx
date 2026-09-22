"use client";

import React, { useState, useEffect } from "react";
import {
  KioskHeader,
  ActiveTab,
  AccessMode,
  GalaxyItem,
} from "@/components/kiosk-header";
import { CalendarView } from "@/components/calendar-view";
import { ChoresView } from "@/components/chores-view";
import { MealsView } from "@/components/meals-view";
import { ListsView } from "@/components/lists-view";
import { ScreensaverView } from "@/components/screensaver-view";
import { ModeSwitcherModal } from "@/components/mode-switcher-modal";
import { NightSleepOverlay } from "@/components/night-sleep-overlay";
import { Inhabitant, InhabitantsModal } from "@/components/inhabitants-modal";
import { CreateGalaxyModal } from "@/components/create-galaxy-modal";
import { CalendarEventData } from "@/components/event-modal";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
  const [accessMode, setAccessMode] = useState<AccessMode>("standard");
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  // Galaxy & Inhabitant State
  const [galaxies, setGalaxies] = useState<GalaxyItem[]>([
    {
      id: "galaxy_sol_family",
      name: "The Sol Family Galaxy (Home)",
      theme: "milky-way",
      icon: "sparkles",
      members: [],
    },
    {
      id: "galaxy_grandparents",
      name: "Grandparents & Co.",
      theme: "andromeda",
      icon: "heart",
      members: [],
    },
    {
      id: "galaxy_kids_orbit",
      name: "Kids Adventure Orbit",
      theme: "supernova",
      icon: "rocket",
      members: [],
    },
  ]);
  const [activeGalaxyId, setActiveGalaxyId] =
    useState<string>("galaxy_sol_family");
  const [inhabitants, setInhabitants] = useState<Inhabitant[]>([]);
  const [events, setEvents] = useState<CalendarEventData[]>([]);

  // Modals
  const [isInhabitantsModalOpen, setIsInhabitantsModalOpen] = useState(false);
  const [isCreateGalaxyModalOpen, setIsCreateGalaxyModalOpen] = useState(false);

  // Fetch Galaxies from API
  const fetchGalaxies = async () => {
    try {
      const res = await fetch("/api/galaxies");
      if (res.ok) {
        const data = await res.json();
        if (data.galaxies && data.galaxies.length > 0) {
          setGalaxies(data.galaxies);
          // If activeGalaxyId is not in list, set to first
          if (!data.galaxies.some((g: GalaxyItem) => g.id === activeGalaxyId)) {
            setActiveGalaxyId(data.galaxies[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load galaxies:", err);
    }
  };

  // Fetch Inhabitants for Active Galaxy
  const fetchInhabitants = async (galaxyId: string) => {
    try {
      const res = await fetch(`/api/galaxies/${galaxyId}/members`);
      if (res.ok) {
        const data = await res.json();
        if (data.members) {
          setInhabitants(data.members);
        }
      }
    } catch (err) {
      console.error("Failed to load inhabitants:", err);
    }
  };

  // Fetch Events for Active Galaxy
  const fetchEvents = async (galaxyId: string) => {
    try {
      const res = await fetch(`/api/events?galaxyId=${galaxyId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  useEffect(() => {
    fetchGalaxies();
  }, []);

  useEffect(() => {
    if (activeGalaxyId) {
      fetchInhabitants(activeGalaxyId);
      fetchEvents(activeGalaxyId);
    }
  }, [activeGalaxyId]);

  // Handle Event Save (Add / Edit)
  const handleSaveEvent = async (eventData: CalendarEventData) => {
    try {
      if (eventData.id) {
        // Update
        const res = await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          await fetchEvents(activeGalaxyId);
        }
      } else {
        // Create
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...eventData,
            galaxyId: activeGalaxyId,
          }),
        });
        if (res.ok) {
          await fetchEvents(activeGalaxyId);
        }
      }
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  };

  // Handle Event Delete
  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchEvents(activeGalaxyId);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Handle Add Inhabitant (e.g. Java the dog or kid)
  const handleAddInhabitant = async (newInhabitant: {
    displayName: string;
    role: "admin" | "member" | "kid" | "pet";
    color: string;
    avatarIcon: string;
  }) => {
    try {
      const res = await fetch(`/api/galaxies/${activeGalaxyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInhabitant),
      });
      if (res.ok) {
        await fetchInhabitants(activeGalaxyId);
        await fetchGalaxies();
      }
    } catch (err) {
      console.error("Failed to add inhabitant:", err);
    }
  };

  // Handle Create New Galaxy
  const handleCreateGalaxy = async (galaxyData: {
    name: string;
    theme: "milky-way" | "andromeda" | "nebula" | "supernova";
    icon: string;
  }) => {
    try {
      const res = await fetch("/api/galaxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(galaxyData),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchGalaxies();
        if (data.galaxy?.id) {
          setActiveGalaxyId(data.galaxy.id);
        }
      }
    } catch (err) {
      console.error("Failed to create galaxy:", err);
    }
  };

  const currentGalaxy =
    galaxies.find((g) => g.id === activeGalaxyId) || galaxies[0];

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

      {/* Inhabitants & Pets Modal */}
      <InhabitantsModal
        isOpen={isInhabitantsModalOpen}
        onClose={() => setIsInhabitantsModalOpen(false)}
        galaxyName={currentGalaxy?.name || "Family Galaxy"}
        inhabitants={inhabitants}
        onAddInhabitant={handleAddInhabitant}
      />

      {/* Create Galaxy Modal */}
      <CreateGalaxyModal
        isOpen={isCreateGalaxyModalOpen}
        onClose={() => setIsCreateGalaxyModalOpen(false)}
        onCreateGalaxy={handleCreateGalaxy}
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
            galaxies={galaxies}
            activeGalaxyId={activeGalaxyId}
            onSelectGalaxy={(id) => setActiveGalaxyId(id)}
            onOpenInhabitantsModal={() => setIsInhabitantsModalOpen(true)}
            onOpenCreateGalaxyModal={() => setIsCreateGalaxyModalOpen(true)}
          />

          {/* Active View */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab === "calendar" && (
              <CalendarView
                accessMode={accessMode}
                activeGalaxyId={activeGalaxyId}
                activeGalaxyName={currentGalaxy?.name}
                inhabitants={inhabitants}
                events={events}
                onSaveEvent={handleSaveEvent}
                onDeleteEvent={handleDeleteEvent}
                onAddInhabitant={handleAddInhabitant}
              />
            )}
            {activeTab === "chores" && <ChoresView accessMode={accessMode} />}
            {activeTab === "meals" && <MealsView accessMode={accessMode} />}
            {activeTab === "lists" && <ListsView accessMode={accessMode} />}
          </div>
        </>
      )}
    </main>
  );
}
