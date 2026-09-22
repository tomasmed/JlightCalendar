"use client";

import React, { useState } from "react";
import { X, Sparkles, Plus, Globe2 } from "lucide-react";

interface CreateGalaxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGalaxy: (galaxy: {
    name: string;
    theme: "milky-way" | "andromeda" | "nebula" | "supernova";
    icon: string;
  }) => Promise<void>;
}

export function CreateGalaxyModal({
  isOpen,
  onClose,
  onCreateGalaxy,
}: CreateGalaxyModalProps) {
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<
    "milky-way" | "andromeda" | "nebula" | "supernova"
  >("milky-way");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateGalaxy({
        name: name.trim(),
        theme,
        icon: "sparkles",
      });
      setName("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmos-void/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cosmos-border flex items-center justify-between bg-cosmos-deep/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-starlight">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Orbit New Galaxy
              </h2>
              <p className="text-xs text-slate-400">
                Create a new shared calendar group or household
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-white border border-cosmos-border transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Galaxy Name
            </label>
            <input
              type="text"
              placeholder="e.g. Grandparents & Extended, Kids Soccer Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Celestial Theme
            </label>
            <select
              value={theme}
              onChange={(e) =>
                setTheme(
                  e.target.value as
                    | "milky-way"
                    | "andromeda"
                    | "nebula"
                    | "supernova"
                )
              }
              className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
            >
              <option value="milky-way">Milky Way (Deep Blue & Violet)</option>
              <option value="andromeda">Andromeda (Cosmic Cyan & Teal)</option>
              <option value="nebula">Nebula (Glowing Fuchsia & Purple)</option>
              <option value="supernova">Supernova (Starlight Gold & Amber)</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-cosmos-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-300 text-sm font-bold border border-cosmos-border transition min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-500/30 transition disabled:opacity-50 min-h-[48px] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Launching..." : "Launch Galaxy"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
