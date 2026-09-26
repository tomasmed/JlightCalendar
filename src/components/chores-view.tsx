"use client";

import React, { useState, useEffect } from "react";
import { Star, CheckCircle, Circle, Plus, Sparkles, X, User, Trash2 } from "lucide-react";
import { AccessMode } from "./kiosk-header";

interface ChoreItem {
  id: string;
  memberId: string;
  memberName: string;
  memberColor: string;
  title: string;
  points: number;
  completed: boolean;
  frequency: string;
  recurrenceType?: string;
  dueTime?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  starBalance: number;
}

interface ChoresViewProps {
  accessMode: AccessMode;
  activeGalaxyId?: string;
}

export function ChoresView({ accessMode, activeGalaxyId }: ChoresViewProps) {
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [starBalances, setStarBalances] = useState<Record<string, number>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Add Chore Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [newRecurrence, setNewRecurrence] = useState("daily");

  const fetchChores = async () => {
    try {
      const url = activeGalaxyId
        ? `/api/chores?galaxyId=${activeGalaxyId}`
        : "/api/chores";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChores(data.chores || []);
        setStarBalances(data.starBalances || {});
        if (data.members) {
          setMembers(data.members);
          if (!newMemberId && data.members.length > 0) {
            setNewMemberId(data.members[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load chores from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChores();
  }, [activeGalaxyId]);

  const toggleChore = async (choreId: string) => {
    // Optimistic UI update
    setChores((prev) =>
      prev.map((c) => {
        if (c.id === choreId) {
          const nextCompleted = !c.completed;
          setStarBalances((stars) => ({
            ...stars,
            [c.memberName]: Math.max(
              0,
              (stars[c.memberName] || 0) + (nextCompleted ? c.points : -c.points)
            ),
          }));
          return { ...c, completed: nextCompleted };
        }
        return c;
      })
    );

    try {
      const res = await fetch("/api/chores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.starBalances) {
          setStarBalances(data.starBalances);
        }
      }
    } catch (err) {
      console.error("Failed to toggle chore:", err);
      // Re-fetch on error to ensure sync
      fetchChores();
    }
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMemberId) return;

    try {
      const res = await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: newMemberId,
          title: newTitle.trim(),
          points: newPoints,
          recurrenceType: newRecurrence,
          galaxyId: activeGalaxyId,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setIsAddModalOpen(false);
        fetchChores();
      }
    } catch (err) {
      console.error("Failed to add chore:", err);
    }
  };

  const handleDeleteChore = async (choreId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this chore?")) return;
    try {
      const res = await fetch(`/api/chores?choreId=${encodeURIComponent(choreId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChores((prev) => prev.filter((c) => c.id !== choreId));
      }
    } catch (err) {
      console.error("Failed to delete chore:", err);
    }
  };

  const filteredChores =
    selectedMemberId === "all"
      ? chores
      : chores.filter((c) => c.memberId === selectedMemberId);

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Header & Rewards Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 md:pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-starlight">
            Daily Chores & Routines
          </h2>
          <p className="text-xs text-slate-400">
            Backed to database — check off tasks to earn family reward stars!
          </p>
        </div>

        {/* Member Star Balances */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-sm shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-xs font-bold text-slate-200">{m.name}:</span>
              <span className="flex items-center gap-1 font-black text-starlight text-xs">
                <Star className="w-3.5 h-3.5 fill-starlight text-starlight" />
                {starBalances[m.name] ?? m.starBalance ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Member Filter Chips & Add Button */}
      <div className="flex items-center justify-between gap-2 py-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedMemberId("all")}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition min-h-[44px] shrink-0 ${
              selectedMemberId === "all"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                : "bg-cosmos-surface border border-cosmos-border text-slate-400 hover:text-white"
            }`}
          >
            All Members
          </button>
          {members.map((m) => {
            const isSelected = selectedMemberId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition min-h-[44px] shrink-0 border ${
                  isSelected
                    ? "bg-cosmos-card text-white shadow-md"
                    : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                }`}
                style={{ borderColor: isSelected ? m.color : undefined }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>

        {accessMode !== "kid" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-md transition min-h-[44px] shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Chore</span>
          </button>
        )}
      </div>

      {/* Chores Grid / List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading chores...</div>
        ) : filteredChores.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400 opacity-60" />
            <p className="font-semibold text-sm">No chores found for this view!</p>
          </div>
        ) : (
          filteredChores.map((chore) => (
            <div
              key={chore.id}
              onClick={() => toggleChore(chore.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                chore.completed
                  ? "bg-cosmos-deep/40 border-cosmos-border/50 opacity-60"
                  : "bg-cosmos-card hover:bg-cosmos-cardHover border-cosmos-border shadow-lg"
              }`}
              style={{
                borderLeftWidth: "6px",
                borderLeftColor: chore.memberColor,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {chore.completed ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-500 hover:text-slate-300" />
                  )}
                </div>
                <div>
                  <span
                    className={`text-sm sm:text-base font-bold block ${
                      chore.completed
                        ? "line-through text-slate-400"
                        : "text-slate-100"
                    }`}
                  >
                    {chore.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {chore.memberName}
                    </span>
                    <span>•</span>
                    {chore.frequency === "One-Time Task" || chore.recurrenceType === "one_time" ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                        ⚡ One-Time
                      </span>
                    ) : (
                      <span>{chore.frequency}</span>
                    )}
                    {chore.dueTime && <span>at {chore.dueTime}</span>}
                  </div>
                </div>
              </div>

              {/* Right: Points Badge & Delete */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-xs shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>+{chore.points}</span>
                </div>

                {accessMode !== "kid" && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteChore(chore.id, e)}
                    title="Delete chore"
                    className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Chore Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cosmos-border">
              <h3 className="text-lg font-black text-white">Add New Chore</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChore} className="space-y-4 py-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Chore Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Put away laundry, Water plants..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Assign to Family Member
                </label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-cosmos-card">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Reward Stars
                  </label>
                  <select
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value={1} className="bg-cosmos-card">1 Star</option>
                    <option value={2} className="bg-cosmos-card">2 Stars</option>
                    <option value={3} className="bg-cosmos-card">3 Stars</option>
                    <option value={5} className="bg-cosmos-card">5 Stars</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Frequency
                  </label>
                  <select
                    value={newRecurrence}
                    onChange={(e) => setNewRecurrence(e.target.value)}
                    className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-sm focus:outline-none focus:border-purple-500 min-h-[48px]"
                  >
                    <option value="daily" className="bg-cosmos-card">Daily</option>
                    <option value="weekly" className="bg-cosmos-card">Weekly</option>
                    <option value="one_time" className="bg-cosmos-card">One-Time (Non-repeating)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-xs font-bold text-white shadow-md"
                >
                  Save Chore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
