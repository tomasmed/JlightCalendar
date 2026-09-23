"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Sparkles,
  User,
  Baby,
  Dog,
  Cat,
  Shield,
  Heart,
  Palette,
} from "lucide-react";

export interface Inhabitant {
  id: string;
  galaxyId: string;
  displayName: string;
  role: "owner" | "admin" | "member" | "viewer" | "kid" | "pet";
  color: string;
  avatarIcon: string;
  starBalance: number;
}

interface InhabitantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  galaxyName: string;
  inhabitants: Inhabitant[];
  onAddInhabitant: (newInhabitant: {
    displayName: string;
    role: "admin" | "member" | "kid" | "pet";
    color: string;
    avatarIcon: string;
  }) => Promise<void>;
}

const COLOR_PRESETS = [
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#6366f1", // Indigo
];

export function InhabitantsModal({
  isOpen,
  onClose,
  galaxyName,
  inhabitants,
  onAddInhabitant,
}: InhabitantsModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "kid" | "pet">("member");
  const [avatar, setAvatar] = useState("user");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddInhabitant({
        displayName: name.trim(),
        role,
        color: selectedColor,
        avatarIcon: avatar,
      });
      setName("");
      setRole("member");
      setAvatar("user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "dog":
        return Dog;
      case "cat":
        return Cat;
      case "baby":
        return Baby;
      case "sparkles":
        return Sparkles;
      default:
        return User;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmos-void/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cosmos-border flex items-center justify-between bg-cosmos-deep/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-starlight">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Galaxy Inhabitants
              </h2>
              <p className="text-xs text-slate-400">
                People, kids, and pets in <span className="text-starlight font-bold">{galaxyName}</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Current Inhabitants List */}
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-3">
              Active Crew & Companions ({inhabitants.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inhabitants.map((inhabitant) => {
                const Icon = getIcon(inhabitant.avatarIcon);
                return (
                  <div
                    key={inhabitant.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-cosmos-surface/80 border border-cosmos-border hover:border-cosmos-borderLight transition"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                      style={{ backgroundColor: inhabitant.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {inhabitant.displayName}
                        </span>
                        {inhabitant.role === "pet" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Pet
                          </span>
                        )}
                        {inhabitant.role === "kid" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Kid
                          </span>
                        )}
                        {inhabitant.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 capitalize">
                        {inhabitant.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Inhabitant Form */}
          <form
            onSubmit={handleAdd}
            className="p-5 rounded-2xl bg-cosmos-deep/80 border border-cosmos-borderLight space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-starlight flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Inhabitant / Companion (e.g. Java the Dog)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Java, Grandma Sue, Baby Leo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Role in Galaxy
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "member" | "kid" | "pet")
                  }
                  className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
                >
                  <option value="member">Family Member (Standard)</option>
                  <option value="admin">Admin / Parent</option>
                  <option value="kid">Child / Kid Profile</option>
                  <option value="pet">Pet / Companion (Java, etc.)</option>
                </select>
              </div>
            </div>

            {/* Avatar & Color Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Avatar Icon
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: "user", icon: User, label: "Person" },
                    { id: "baby", icon: Baby, label: "Child" },
                    { id: "dog", icon: Dog, label: "Dog" },
                    { id: "cat", icon: Cat, label: "Cat" },
                    { id: "sparkles", icon: Sparkles, label: "Star" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setAvatar(item.id)}
                        className={`p-3 rounded-xl border flex items-center justify-center min-w-[48px] min-h-[48px] transition ${
                          avatar === item.id
                            ? "bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-500/20"
                            : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-9 h-9 rounded-xl border-2 transition min-w-[36px] min-h-[36px] ${
                        selectedColor === color
                          ? "border-white scale-110 shadow-lg"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-500/30 transition disabled:opacity-50 min-h-[48px] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Adding..." : "Add to Galaxy"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
