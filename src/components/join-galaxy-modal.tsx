"use client";

import React, { useState } from "react";
import { X, Sparkles, Globe2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface JoinGalaxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGalaxyJoined: (galaxyId: string) => void;
  initialCode?: string;
}

export function JoinGalaxyModal({
  isOpen,
  onClose,
  onGalaxyJoined,
  initialCode = "",
}: JoinGalaxyModalProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/galaxies/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join galaxy. Check the code and try again.");
      } else {
        setSuccessMessage(data.message || "Successfully connected to galaxy!");
        setTimeout(() => {
          if (data.galaxy?.id) {
            onGalaxyJoined(data.galaxy.id);
          }
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Join galaxy error:", err);
      setError("An unexpected error occurred while connecting to the galaxy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-cosmos-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/30 text-starlight">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Join a Galaxy</h3>
              <p className="text-xs text-slate-400">
                Connect to a shared family or household orbit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2">
              Galaxy Join Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. GLX-8K9A-2M4N"
                maxLength={16}
                className="w-full bg-cosmos-deep border border-cosmos-border rounded-xl px-4 py-3 text-lg font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 uppercase tracking-wider min-h-[48px]"
                autoFocus
              />
              <Sparkles className="w-4 h-4 text-starlight absolute right-4 top-1/2 -translate-y-1/2 opacity-60" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Ask the owner or admin of the Galaxy for their unique join code (found in their Galaxy Switcher menu).
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-xs font-bold text-slate-300 transition min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-xs text-white shadow-lg shadow-purple-500/25 transition disabled:opacity-50 flex items-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <span>Join Galaxy</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
