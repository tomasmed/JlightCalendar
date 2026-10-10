"use client";

import React from "react";
import {
  X,
  Sparkles,
  PartyPopper,
  CheckCircle2,
  Calendar,
  Layers,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { CHANGELOG_HISTORY } from "@/lib/changelog";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cosmos-border flex items-center justify-between bg-cosmos-deep/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-starlight/20 text-starlight border border-starlight/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  What&apos;s New in JlightCalendar
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-starlight/20 text-starlight border border-starlight/40">
                  Changelog
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Latest updates, delightful seasonal themes, and family kiosk improvements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close changelog modal"
            className="p-3 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-white border border-cosmos-border transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changelog Entries List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {CHANGELOG_HISTORY.map((item, index) => (
            <div
              key={item.version}
              className={`p-5 rounded-2xl border transition ${
                index === 0
                  ? "bg-cosmos-surface/90 border-starlight/40 shadow-lg shadow-starlight/5"
                  : "bg-cosmos-surface/40 border-cosmos-border opacity-90"
              }`}
            >
              {/* Release Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-cosmos-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-black text-white px-2.5 py-1 rounded-lg bg-cosmos-deep border border-cosmos-border">
                    {item.version}
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {item.releaseDate}
                </span>
              </div>

              {/* Highlights */}
              <ul className="space-y-2.5">
                {item.highlights.map((h, hIdx) => {
                  let badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                  if (h.category === "New") badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                  if (h.category === "Delight") badgeColor = "bg-orange-500/20 text-orange-400 border-orange-500/30";
                  if (h.category === "Improvement") badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";

                  return (
                    <li key={hIdx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                      <span
                        className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${badgeColor}`}
                      >
                        {h.category}
                      </span>
                      <span>{h.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cosmos-border bg-cosmos-deep/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-starlight" />
            <span>Built for family wall displays and modern browsers</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-starlight text-slate-950 hover:opacity-90 font-black text-xs transition shadow-md min-h-[48px] min-w-[80px]"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
