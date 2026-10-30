"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Utensils,
  Moon,
  Image as ImageIcon,
  Globe2,
  ArrowRight,
  Eye,
  Star,
  Info,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { ChangelogModal } from "./changelog-modal";

interface LandingPageProps {
  onExploreDemo: () => void;
  onJoinCodeSubmit?: (code: string) => void;
  onLaunchComet?: (options: {
    name: string;
    creatorName: string;
    ttlDays: number;
  }) => Promise<void> | void;
}

export function LandingPage({
  onExploreDemo,
  onJoinCodeSubmit,
  onLaunchComet,
}: LandingPageProps) {
  const [quickJoinCode, setQuickJoinCode] = useState("");
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [cometName, setCometName] = useState("");
  const [cometCreator, setCometCreator] = useState("");
  const [cometTtlDays, setCometTtlDays] = useState<number>(150);
  const [isLaunchingComet, setIsLaunchingComet] = useState(false);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickJoinCode.trim()) {
      if (onJoinCodeSubmit) {
        onJoinCodeSubmit(quickJoinCode.trim());
      } else {
        signIn("google");
      }
    }
  };

  const handleCreateCometSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cometName.trim() || !onLaunchComet) return;
    setIsLaunchingComet(true);
    try {
      await onLaunchComet({
        name: cometName.trim(),
        creatorName: cometCreator.trim() || "Comet Host",
        ttlDays: cometTtlDays,
      });
    } finally {
      setIsLaunchingComet(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cosmos-void text-slate-100 flex flex-col overflow-y-auto selection:bg-purple-600 selection:text-white">
      {/* Changelog Modal */}
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />

      {/* Ambient Celestial Glows */}
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed top-[40%] left-[-10%] w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-tight">
              Jlight<span className="text-starlight">Calendar</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Shared Calendars for Home &amp; Group Plans
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Changelog Info Button */}
          <button
            onClick={() => setIsChangelogOpen(true)}
            aria-label="View latest changelog and updates"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-300 hover:text-white transition min-h-[44px]"
            title="What's New / Changelog"
          >
            <Info className="w-4 h-4 text-starlight" />
            <span className="hidden md:inline">What&apos;s New</span>
          </button>

          <button
            onClick={onExploreDemo}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-xs font-bold text-slate-300 hover:text-white transition min-h-[44px]"
          >
            <Eye className="w-4 h-4 text-starlight-cyan" />
            <span>Try Live Demo</span>
          </button>

          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition min-h-[44px]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-10 pb-16 relative z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-6 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-starlight" />
          <span>For Households, Friends &amp; Quick Group Plans</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-starlight">
          One Shared Calendar Everyone Actually Checks
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed">
          Keep your household on the same page with color-coded schedules, chores, and meal plans—or spin up a temporary calendar for a trip or project in seconds, with no sign-up required.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => signIn("google")}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-base shadow-xl shadow-purple-500/30 transition transform hover:scale-[1.02] min-h-[52px]"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign In for Home Calendar</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onExploreDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border hover:border-purple-500/50 text-slate-200 font-bold text-base transition min-h-[52px]"
          >
            <Eye className="w-5 h-5 text-starlight-cyan" />
            <span>See Sample Calendar</span>
          </button>
        </div>

        {/* Join with Galaxy or Comet Code Bar */}
        <form
          onSubmit={handleQuickJoin}
          className="mt-6 flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-cosmos-card/80 border border-cosmos-border backdrop-blur-md max-w-md w-full"
        >
          <input
            type="text"
            value={quickJoinCode}
            onChange={(e) => setQuickJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code (e.g. CMT-4K8A or GLX-8K9)"
            className="w-full bg-transparent px-4 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none uppercase min-h-[44px]"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cosmos-surface hover:bg-purple-600/40 text-starlight text-xs font-bold border border-purple-500/30 transition flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
          >
            <span>Open Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Instant Ephemeral Comet Builder Card (No Sign-In Required) */}
        {onLaunchComet && (
          <div className="mt-8 w-full max-w-3xl rounded-3xl bg-gradient-to-br from-cyan-950/60 via-cosmos-card/90 to-indigo-950/60 border border-cyan-500/30 p-5 sm:p-6 text-left shadow-xl shadow-cyan-500/10 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">☄️</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Start a Temporary Shared Calendar</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      No Account Needed
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Planning a weekend trip, a quick project sprint, or a few meetings with friends? Create a shared Comet calendar, send the link, and export your dates to Google or Apple Calendar whenever you&apos;re ready.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleCreateCometSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Calendar Name
                </label>
                <input
                  type="text"
                  required
                  value={cometName}
                  onChange={(e) => setCometName(e.target.value)}
                  placeholder="e.g. Q4 Sprint, Cabin Weekend"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cosmos-surface/90 border border-cosmos-border text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[48px]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={cometCreator}
                  onChange={(e) => setCometCreator(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cosmos-surface/90 border border-cosmos-border text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[48px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Keep For
                </label>
                <select
                  value={cometTtlDays}
                  onChange={(e) => setCometTtlDays(Number(e.target.value))}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-cosmos-surface/90 border border-cosmos-border text-xs font-bold text-white focus:outline-none focus:border-cyan-400 min-h-[48px]"
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={150}>5 Months</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isLaunchingComet || !cometName.trim()}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-1.5 min-h-[48px]"
                >
                  <span>{isLaunchingComet ? "Creating..." : "Create ☄️"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Features Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left w-full">
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-starlight-purple flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6 text-starlight" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Separate Spaces for Every Group
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep your household schedule private while sharing a separate calendar with grandparents, co-parents, or a weekend trip group using a simple invite code.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Ambient Photo Frame &amp; Wall Kiosk
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Turn any wall tablet into a live digital photo frame connected to Google Photos shared albums or Immich, complete with Night Sleep OLED protection.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Chores Kids Actually Check Off
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assign daily or weekly tasks and let kids earn stars as they finish them—simple, visual, and easy to follow without nagging.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Color-Coded by Person (Even Pets)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Give everyone their own color—including the dog&apos;s vet visits—and switch between month, week, and side-by-side day views at a glance.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-4">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Dinner Plans &amp; Shared Lists
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plan the week&apos;s meals together and keep a live grocery, packing, or to-do list that stays updated across everyone&apos;s phone.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-3xl bg-cosmos-card/70 border border-cosmos-border backdrop-blur-md hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
              <Moon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Import &amp; Export Anywhere (.ics)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import existing `.ics` schedules or export any date window to Google Calendar, Apple Calendar, or Outlook in one click.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-cosmos-border/60 py-6 px-4 text-center text-xs text-slate-500 relative z-10">
        <p>JlightCalendar — Open-Source Shared Calendars for Families, Friends &amp; Teams (AGPLv3)</p>
      </footer>
    </div>
  );
}
