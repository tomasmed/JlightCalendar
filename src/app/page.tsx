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
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { Inhabitant, InhabitantsModal } from "@/components/inhabitants-modal";
import { CreateGalaxyModal } from "@/components/create-galaxy-modal";
import { JoinGalaxyModal } from "@/components/join-galaxy-modal";
import { AgentWallModal } from "@/components/agent-wall-modal";
import { ExportCalendarModal } from "@/components/export-calendar-modal";
import { LandingPage } from "@/components/landing-page";
import { CalendarEventData } from "@/components/event-modal";
import { useSession, signIn } from "next-auth/react";
import { Sparkles, ArrowRight, Download, Copy, Check, Globe2 } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
  const [accessMode, setAccessMode] = useState<AccessMode>("standard");
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Galaxy & Inhabitant State
  const [galaxies, setGalaxies] = useState<GalaxyItem[]>([]);
  const [activeGalaxyId, setActiveGalaxyId] = useState<string>("");
  const [inhabitants, setInhabitants] = useState<Inhabitant[]>([]);
  const [events, setEvents] = useState<CalendarEventData[]>([]);

  // Modals
  const [isInhabitantsModalOpen, setIsInhabitantsModalOpen] = useState(false);
  const [isCreateGalaxyModalOpen, setIsCreateGalaxyModalOpen] = useState(false);
  const [isJoinGalaxyModalOpen, setIsJoinGalaxyModalOpen] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const [isAgentWallModalOpen, setIsAgentWallModalOpen] = useState(false);
  const [agentWallInitialTab, setAgentWallInitialTab] = useState<"wall" | "mint" | "claim">("wall");
  const [pendingClaimBotCode, setPendingClaimBotCode] = useState("");
  const [activeCometParam, setActiveCometParam] = useState<string>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedCometLink, setCopiedCometLink] = useState(false);
  const [isConvertingComet, setIsConvertingComet] = useState(false);

  // Inspect URL parameters on mount (?join=..., ?comet=..., ?demo=true, or ?claimBot=BOT-XXXX)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const joinParam = searchParams.get("join");
      const cometParam = searchParams.get("comet");
      const demoParam = searchParams.get("demo");
      const claimBotParam = searchParams.get("claimBot");

      if (cometParam) {
        setActiveCometParam(cometParam.trim());
      } else if (joinParam && joinParam.trim().toUpperCase().startsWith("CMT")) {
        setActiveCometParam(joinParam.trim().toUpperCase());
      } else if (joinParam) {
        setPendingJoinCode(joinParam.toUpperCase());
        setIsJoinGalaxyModalOpen(true);
      }
      if (demoParam === "true") {
        setIsDemoMode(true);
      }
      if (claimBotParam) {
        setPendingClaimBotCode(claimBotParam.toUpperCase());
        setAgentWallInitialTab("claim");
        setIsAgentWallModalOpen(true);
      }
    }
  }, []);

  // Fetch Galaxies from API
  const fetchGalaxies = async (targetGalaxyId?: string, cometOverride?: string) => {
    try {
      const cometCode = cometOverride !== undefined ? cometOverride : activeCometParam;
      const params = new URLSearchParams();
      if (!session?.user && isDemoMode && !cometCode) {
        params.set("demo", "true");
      }
      if (cometCode) {
        params.set("comet", cometCode);
      }
      const qs = params.toString();
      const url = qs ? `/api/galaxies?${qs}` : "/api/galaxies";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: GalaxyItem[] = data.galaxies || [];
        setGalaxies(list);
        if (targetGalaxyId && list.some((g) => g.id === targetGalaxyId)) {
          setActiveGalaxyId(targetGalaxyId);
        } else if (cometCode) {
          const matchedComet = list.find(
            (g) =>
              g.id === cometCode ||
              g.joinCode?.toUpperCase() === cometCode.toUpperCase() ||
              g.slug?.toLowerCase() === cometCode.toLowerCase() ||
              g.isEphemeral
          );
          if (matchedComet) {
            setActiveGalaxyId(matchedComet.id);
          } else if (list.length > 0) {
            setActiveGalaxyId(list[0].id);
          }
        } else if (list.length > 0 && (!activeGalaxyId || !list.some((g) => g.id === activeGalaxyId))) {
          setActiveGalaxyId(list[0].id);
        } else if (session?.user && list.length === 0) {
          setGalaxies([]);
        }
        return list;
      }
    } catch (err) {
      console.error("Failed to load galaxies:", err);
    }
    return [];
  };

  // Fetch Inhabitants for Active Galaxy
  const fetchInhabitants = async (galaxyId: string) => {
    if (!galaxyId) return;
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
    if (!galaxyId) return;
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
    if (status !== "loading") {
      fetchGalaxies();
    }
  }, [session?.user?.id, isDemoMode, activeCometParam, status]);

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
        const res = await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          await fetchEvents(activeGalaxyId);
        }
      } else {
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

  // Handle Event Delete (Single Occurrence vs Full Series)
  const handleDeleteEvent = async (id: string, exdate?: string) => {
    try {
      const url = exdate
        ? `/api/events?id=${encodeURIComponent(id)}&exdate=${encodeURIComponent(exdate)}`
        : `/api/events?id=${encodeURIComponent(id)}`;

      const res = await fetch(url, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchEvents(activeGalaxyId);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Handle Add Inhabitant
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

  // Handle Update Inhabitant (Color, Avatar, Name, Role)
  const handleUpdateInhabitant = async (updatedMember: {
    id: string;
    displayName?: string;
    role?: "admin" | "member" | "kid" | "pet";
    color?: string;
    avatarIcon?: string;
  }) => {
    if (!activeGalaxyId || !updatedMember.id) return;
    try {
      const res = await fetch(`/api/galaxies/${activeGalaxyId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: updatedMember.id,
          displayName: updatedMember.displayName,
          role: updatedMember.role,
          color: updatedMember.color,
          avatarIcon: updatedMember.avatarIcon,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update inhabitant.");
      }
      setInhabitants((prev) =>
        prev.map((inh) =>
          inh.id === updatedMember.id
            ? {
                ...inh,
                ...(updatedMember.displayName ? { displayName: updatedMember.displayName } : {}),
                ...(updatedMember.role ? { role: updatedMember.role } : {}),
                ...(updatedMember.color ? { color: updatedMember.color } : {}),
                ...(updatedMember.avatarIcon ? { avatarIcon: updatedMember.avatarIcon } : {}),
              }
            : inh
        )
      );
      await fetchInhabitants(activeGalaxyId);
      await fetchGalaxies();
      await fetchEvents(activeGalaxyId);
    } catch (err) {
      console.error("Failed to update inhabitant:", err);
      throw err;
    }
  };

  // Handle Remove Inhabitant
  const handleRemoveInhabitant = async (memberId: string) => {
    if (!activeGalaxyId || !memberId) return;
    try {
      const res = await fetch(
        `/api/galaxies/${activeGalaxyId}/members?memberId=${encodeURIComponent(
          memberId
        )}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove inhabitant.");
      }
      await fetchInhabitants(activeGalaxyId);
      await fetchGalaxies();
      await fetchEvents(activeGalaxyId);
    } catch (err) {
      console.error("Failed to remove inhabitant:", err);
      throw err;
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create galaxy.");
      }
      if (data.galaxy?.id) {
        await fetchGalaxies(data.galaxy.id);
        setActiveGalaxyId(data.galaxy.id);
      } else {
        await fetchGalaxies();
      }
    } catch (err) {
      console.error("Failed to create galaxy:", err);
      throw err;
    }
  };

  // Handle Update Whole-Family Identity (Color & Avatar)
  const handleUpdateFamilyIdentity = async (identity: {
    familyColor: string;
    familyAvatar: string;
  }) => {
    if (!activeGalaxyId) return;
    try {
      const res = await fetch("/api/galaxies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galaxyId: activeGalaxyId,
          familyColor: identity.familyColor,
          familyAvatar: identity.familyAvatar,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update family identity.");
      }
      await fetchGalaxies();
    } catch (err) {
      console.error("Failed to update family identity:", err);
      throw err;
    }
  };

  // Handle Launching an Instant Ephemeral Comet (No Login Required)
  const handleLaunchComet = async (options: {
    name: string;
    creatorName: string;
    ttlDays: number;
  }) => {
    try {
      const res = await fetch("/api/comets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (res.ok && data.comet) {
        const code = data.comet.joinCode || data.comet.id;
        if (typeof window !== "undefined") {
          window.history.replaceState(
            {},
            "",
            `/?comet=${encodeURIComponent(code)}`
          );
        }
        setActiveCometParam(code);
        setGalaxies((prev) => [
          data.comet,
          ...prev.filter((g) => g.id !== data.comet.id),
        ]);
        setActiveGalaxyId(data.comet.id);
        setActiveTab("calendar");
      }
    } catch (err) {
      console.error("Failed to launch Ephemeral Comet:", err);
    }
  };

  // Handle Converting an Ephemeral Comet into a Permanent Galaxy (OAuth User)
  const handleConvertCometToGalaxy = async (cometId: string) => {
    if (!cometId) return;
    if (!session?.user) {
      signIn("google");
      return;
    }
    setIsConvertingComet(true);
    try {
      const res = await fetch("/api/comets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_to_galaxy",
          cometId,
        }),
      });
      if (res.ok) {
        setActiveCometParam("");
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/");
        }
        await fetchGalaxies(cometId, "");
      }
    } catch (err) {
      console.error("Failed to convert Comet to Galaxy:", err);
    } finally {
      setIsConvertingComet(false);
    }
  };

  // If user is unauthenticated and not exploring demo kiosk or an Ephemeral Comet, display the Landing Page
  if (status !== "loading" && !session?.user && !isDemoMode && !activeCometParam) {
    return (
      <LandingPage
        onExploreDemo={() => setIsDemoMode(true)}
        onLaunchComet={handleLaunchComet}
        onJoinCodeSubmit={(code) => {
          const upper = code.trim().toUpperCase();
          if (upper.startsWith("CMT")) {
            if (typeof window !== "undefined") {
              window.history.replaceState(
                {},
                "",
                `/?comet=${encodeURIComponent(upper)}`
              );
            }
            setActiveCometParam(upper);
          } else {
            setPendingJoinCode(upper);
            setIsJoinGalaxyModalOpen(true);
          }
        }}
      />
    );
  }

  const currentGalaxy =
    galaxies.find((g) => g.id === activeGalaxyId) ||
    galaxies[0] ||
    (session?.user
      ? {
          id: activeGalaxyId || "",
          name: `${session.user.name || "My"}'s Galaxy`,
          theme: "milky-way",
          icon: "sparkles",
          familyColor: "#ef4444",
          familyAvatar: "planet",
        }
      : {
          id: "galaxy_sol_family",
          name: "The Sol Family Galaxy",
          theme: "milky-way",
          icon: "sparkles",
          familyColor: "#ef4444",
          familyAvatar: "planet",
        });

  return (
    <main className="h-[100dvh] w-full max-w-[100vw] flex flex-col overflow-hidden bg-cosmos-void text-cosmos-text select-none relative">
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
        accessMode={accessMode}
        familyColor={currentGalaxy?.familyColor || "#ef4444"}
        familyAvatar={currentGalaxy?.familyAvatar || "planet"}
        onUpdateFamilyIdentity={handleUpdateFamilyIdentity}
        onAddInhabitant={handleAddInhabitant}
        onUpdateInhabitant={handleUpdateInhabitant}
        onRemoveInhabitant={handleRemoveInhabitant}
      />

      {/* Create Galaxy Modal */}
      <CreateGalaxyModal
        isOpen={isCreateGalaxyModalOpen}
        onClose={() => setIsCreateGalaxyModalOpen(false)}
        onCreateGalaxy={handleCreateGalaxy}
      />

      {/* Join Galaxy with Code Modal */}
      <JoinGalaxyModal
        isOpen={isJoinGalaxyModalOpen}
        onClose={() => {
          setIsJoinGalaxyModalOpen(false);
          setPendingJoinCode("");
        }}
        initialCode={pendingJoinCode}
        onGalaxyJoined={async (newGalaxyId) => {
          await fetchGalaxies();
          setActiveGalaxyId(newGalaxyId);
        }}
      />

      {/* Agent Envoys & Bot Wall Modal */}
      <AgentWallModal
        isOpen={isAgentWallModalOpen}
        onClose={() => {
          setIsAgentWallModalOpen(false);
          setPendingClaimBotCode("");
          setAgentWallInitialTab("wall");
        }}
        galaxyId={activeGalaxyId}
        inhabitants={inhabitants.map((inh) => ({
          id: inh.id,
          name: inh.displayName,
          color: inh.color,
          role: inh.role,
        }))}
        initialTab={agentWallInitialTab}
        initialClaimCode={pendingClaimBotCode}
      />

      {/* Time-Window .ics Export & Galaxy Portability Modal */}
      <ExportCalendarModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        galaxyId={activeGalaxyId || currentGalaxy?.id || ""}
        galaxyName={currentGalaxy?.name || "Calendar"}
        isEphemeral={Boolean(currentGalaxy?.isEphemeral)}
        inhabitants={inhabitants}
        events={events}
        permanentGalaxies={galaxies
          .filter((g) => !g.isEphemeral)
          .map((g) => ({ id: g.id, name: g.name }))}
        onCopiedToGalaxy={async () => {
          await fetchGalaxies();
        }}
      />

      {/* Ephemeral Comet Status & Portability Banner */}
      {currentGalaxy?.isEphemeral && (
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/40 px-3 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 z-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-cyan-300 font-extrabold text-[11px] sm:text-xs">
              <span>☄️ Ephemeral Comet</span>
              {currentGalaxy.joinCode && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 font-mono text-white">
                  {currentGalaxy.joinCode}
                </span>
              )}
            </span>
            {currentGalaxy.expiresAt && (
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                • Auto-spins down{" "}
                {new Date(currentGalaxy.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const code = currentGalaxy.joinCode || currentGalaxy.id;
                  const shareUrl = `${window.location.origin}/?comet=${encodeURIComponent(code)}`;
                  navigator.clipboard.writeText(shareUrl);
                  setCopiedCometLink(true);
                  setTimeout(() => setCopiedCometLink(false), 2000);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cosmos-surface hover:bg-cosmos-cardHover border border-cyan-500/30 text-cyan-200 font-bold text-[11px] transition"
            >
              {copiedCometLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Share Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>Export .ics</span>
            </button>

            <button
              type="button"
              disabled={isConvertingComet}
              onClick={() => handleConvertCometToGalaxy(currentGalaxy.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition shadow-sm"
            >
              <Globe2 className="w-3 h-3" />
              <span>
                {session?.user
                  ? isConvertingComet
                    ? "Converting..."
                    : "Convert to Permanent Galaxy"
                  : "Sign In to Keep Forever"}
              </span>
            </button>

            {!session?.user && (
              <button
                type="button"
                onClick={() => {
                  setActiveCometParam("");
                  if (typeof window !== "undefined") {
                    window.history.replaceState({}, "", "/");
                  }
                }}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-white font-bold text-[11px] transition"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Demo Mode Notice Banner (Only shown if unauthenticated user is previewing demo) */}
      {isDemoMode && !session?.user && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 border-b border-purple-500/40 px-3 py-1.5 text-center text-xs flex items-center justify-center gap-2 sm:gap-3 shrink-0 z-50">
          <span className="flex items-center gap-1.5 text-starlight font-bold text-[11px] sm:text-xs">
            <Sparkles className="w-3.5 h-3.5 text-starlight" />
            <span>Sandbox Demo Mode</span>
          </span>
          <span className="text-slate-400 hidden md:inline text-[11px]">
            Previewing sample family data. Sign in to create and join private family orbits.
          </span>
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] sm:text-xs transition shadow-sm"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

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
            onToggleSleep={() => {
              setIsSleeping(true);
              // Trigger automated background snapshot upon night sleep
              fetch("/api/backup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: "night-sleep" }),
              }).catch(() => {});
            }}
            galaxies={galaxies}
            activeGalaxyId={activeGalaxyId}
            onSelectGalaxy={(id) => setActiveGalaxyId(id)}
            onOpenInhabitantsModal={() => setIsInhabitantsModalOpen(true)}
            onOpenCreateGalaxyModal={() => setIsCreateGalaxyModalOpen(true)}
            onOpenJoinGalaxyModal={() => setIsJoinGalaxyModalOpen(true)}
            onOpenAgentWallModal={() => {
              setAgentWallInitialTab("wall");
              setIsAgentWallModalOpen(true);
            }}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            user={user}
          />

          {/* Active View Container */}
          <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
            {activeTab === "calendar" && (
              <CalendarView
                accessMode={accessMode}
                activeGalaxyId={activeGalaxyId}
                activeGalaxyName={currentGalaxy?.name}
                familyColor={currentGalaxy?.familyColor || "#ef4444"}
                familyAvatar={currentGalaxy?.familyAvatar || "planet"}
                inhabitants={inhabitants}
                events={events}
                onSaveEvent={handleSaveEvent}
                onDeleteEvent={handleDeleteEvent}
                onUpdateFamilyIdentity={handleUpdateFamilyIdentity}
                onAddInhabitant={handleAddInhabitant}
                onUpdateInhabitant={handleUpdateInhabitant}
                onRemoveInhabitant={handleRemoveInhabitant}
              />
            )}
            {activeTab === "chores" && (
              <ChoresView
                accessMode={accessMode}
                activeGalaxyId={activeGalaxyId}
              />
            )}
            {activeTab === "meals" && (
              <MealsView
                accessMode={accessMode}
                activeGalaxyId={activeGalaxyId}
              />
            )}
            {activeTab === "lists" && (
              <ListsView
                accessMode={accessMode}
                activeGalaxyId={activeGalaxyId}
              />
            )}
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <MobileNavBar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            accessMode={accessMode}
            isEphemeral={Boolean(currentGalaxy?.isEphemeral)}
          />
        </>
      )}
    </main>
  );
}
