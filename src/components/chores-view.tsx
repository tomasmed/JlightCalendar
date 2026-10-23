"use client";

import React, { useState, useEffect } from "react";
import { Star, CheckCircle, Circle, Plus, Sparkles, X, User, Trash2, Pencil } from "lucide-react";
import { AccessMode } from "./kiosk-header";
import { AgentProvenanceBadge } from "./agent-badge";
import { adaptMemberColor, useActiveTheme } from "@/lib/theme";

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
  createdByAgentId?: string | null;
  agent?: any;
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
  const activeTheme = useActiveTheme();
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [starBalances, setStarBalances] = useState<Record<string, number>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Add / Edit Chore Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [newRecurrence, setNewRecurrence] = useState("daily");
  const [newDueTime, setNewDueTime] = useState("");

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

  const handleOpenAdd = () => {
    setEditingChore(null);
    setNewTitle("");
    setNewPoints(1);
    setNewRecurrence("daily");
    setNewDueTime("");
    if (members.length > 0) {
      setNewMemberId(members[0].id);
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (chore: ChoreItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChore(chore);
    setNewTitle(chore.title);
    setNewMemberId(chore.memberId);
    setNewPoints(chore.points);
    setNewRecurrence(
      chore.recurrenceType ||
      (chore.frequency === "One-Time Task"
        ? "one_time"
        : chore.frequency === "Weekly Routine"
        ? "weekly"
        : "daily")
    );
    setNewDueTime(chore.dueTime || "");
    setIsAddModalOpen(true);
  };

  const handleSaveChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMemberId) return;

    try {
      if (editingChore) {
        const res = await fetch("/api/chores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            choreId: editingChore.id,
            memberId: newMemberId,
            title: newTitle.trim(),
            points: newPoints,
            recurrenceType: newRecurrence,
            dueTime: newDueTime || null,
          }),
        });

        if (res.ok) {
          setIsAddModalOpen(false);
          setEditingChore(null);
          fetchChores();
        }
      } else {
        const res = await fetch("/api/chores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: newMemberId,
            title: newTitle.trim(),
            points: newPoints,
            recurrenceType: newRecurrence,
            dueTime: newDueTime || null,
            galaxyId: activeGalaxyId,
          }),
        });

        if (res.ok) {
          setIsAddModalOpen(false);
          fetchChores();
        }
      }
    } catch (err) {
      console.error("Failed to save chore:", err);
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

  const filteredChores = (
    selectedMemberId === "all"
      ? chores
      : chores.filter((c) => c.memberId === selectedMemberId)
  )
    .slice()
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.dueTime && b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueTime && !b.dueTime) return -1;
      if (!a.dueTime && b.dueTime) return 1;
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-2.5 sm:p-4 md:p-6 overflow-hidden relative">
      {/* Compact Header & Unified Member + Star Filter Strip */}
      <div className="flex flex-col gap-2 pb-2.5 md:pb-4 border-b border-cosmos-border shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-cosmos-text truncate">
              Daily Chores &amp; Routines
            </h2>
            <p className="text-[11px] sm:text-xs text-cosmos-muted hidden sm:block">
              Check off tasks to earn reward stars!
            </p>
          </div>

          {accessMode !== "kid" && (
            <button
              onClick={handleOpenAdd}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl theme-focus-pill font-bold text-xs transition min-h-[44px] shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chore</span>
            </button>
          )}
        </div>

        {/* Unified Interactive Member Filter + Star Balance Strip */}
        <div
          data-testid="chores-unified-filter-strip"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none max-w-full"
        >
          <button
            onClick={() => setSelectedMemberId("all")}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition min-h-[40px] sm:min-h-[44px] min-w-0 shrink-0 ${
              selectedMemberId === "all"
                ? "theme-focus-pill font-extrabold"
                : "bg-cosmos-surface border border-cosmos-border text-cosmos-muted hover:text-cosmos-text"
            }`}
          >
            Everyone
          </button>
          {members.map((m) => {
            const isSelected = selectedMemberId === m.id;
            const stars = starBalances[m.name] ?? m.starBalance ?? 0;
            const memberColor = adaptMemberColor(m.color, activeTheme);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition min-h-[40px] sm:min-h-[44px] min-w-0 shrink-0 border ${
                  isSelected
                    ? "bg-cosmos-card text-cosmos-text border-cosmos-borderLight shadow-sm"
                    : "bg-cosmos-surface border-cosmos-border text-cosmos-muted hover:text-cosmos-text"
                }`}
                style={{
                  borderLeftWidth: isSelected ? "4px" : undefined,
                  borderLeftColor: isSelected ? memberColor : undefined,
                  background: isSelected
                    ? `linear-gradient(90deg, ${memberColor}22 0%, rgb(var(--cosmos-card)) 90%)`
                    : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: memberColor }}
                />
                <span className="whitespace-nowrap">{m.name}</span>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cosmos-surface border border-cosmos-border font-black text-starlight-tension text-[10px] sm:text-xs">
                  <Star className="w-3 h-3 fill-current shrink-0" />
                  <span>{stars}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chores Grid / List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pt-2.5 pb-20 sm:pb-2 pr-1">
        {loading ? (
          <div className="text-center py-12 text-cosmos-muted">Loading chores...</div>
        ) : filteredChores.length === 0 ? (
          <div className="text-center py-12 text-cosmos-muted">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-starlight opacity-60" />
            <p className="font-semibold text-sm">No chores found for this view!</p>
          </div>
        ) : (
          filteredChores.map((chore) => {
            const adaptedChoreColor = adaptMemberColor(chore.memberColor, activeTheme);
            return (
            <div
              key={chore.id}
              onClick={() => toggleChore(chore.id)}
              className={`p-3 sm:p-4 rounded-2xl border theme-card-nmm transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                chore.completed
                  ? "bg-cosmos-deep/40 border-cosmos-border/50 opacity-60"
                  : "border-cosmos-border shadow-md hover:brightness-105"
              }`}
              style={{
                borderLeftWidth: "5px",
                borderLeftColor: adaptedChoreColor,
                background: chore.completed
                  ? undefined
                  : `linear-gradient(90deg, ${adaptedChoreColor}1F 0%, rgb(var(--cosmos-card)) 85%)`,
              }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className="min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center shrink-0">
                  {chore.completed ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-cosmos-muted hover:text-cosmos-text" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm sm:text-base font-bold block truncate sm:whitespace-normal ${
                      chore.completed
                        ? "line-through text-cosmos-muted"
                        : "text-cosmos-text"
                    }`}
                  >
                    {chore.title}
                  </span>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5 text-[11px] sm:text-xs text-cosmos-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-cosmos-muted shrink-0" />
                      {chore.memberName}
                    </span>
                    {chore.agent && (
                      <AgentProvenanceBadge agent={chore.agent} compact />
                    )}
                    <span>•</span>
                    {chore.frequency === "One-Time Task" || chore.recurrenceType === "one_time" ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-cosmos-surface text-starlight-tension font-extrabold text-[10px] border border-cosmos-border">
                        ⚡ One-Time
                      </span>
                    ) : (
                      <span>{chore.frequency}</span>
                    )}
                    {chore.dueTime && <span>at {chore.dueTime}</span>}
                    <span className="sm:hidden inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-cosmos-surface border border-cosmos-border text-starlight-tension font-black text-[10px]">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>+{chore.points}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Points Badge (sm:+), Edit & Delete */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cosmos-surface border border-cosmos-border text-starlight-tension font-black text-xs shrink-0">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>+{chore.points}</span>
                </div>

                {accessMode !== "kid" && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(chore, e)}
                    title="Edit chore"
                    className="p-2 sm:p-2.5 rounded-xl text-cosmos-muted hover:text-starlight hover:bg-cosmos-surface border border-transparent hover:border-cosmos-border transition min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {accessMode !== "kid" && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteChore(chore.id, e)}
                    title="Delete chore"
                    className="p-2 sm:p-2.5 rounded-xl text-cosmos-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) for Thumb-Zone Chore Creation (<640px) */}
      {accessMode !== "kid" && (
        <button
          type="button"
          data-testid="mobile-add-chore-fab"
          onClick={handleOpenAdd}
          aria-label="Add Chore"
          title="Add Chore"
          className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-2xl theme-focus-pill shadow-xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Add Chore Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-cosmos-card border border-cosmos-borderLight rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cosmos-border">
              <h3 className="text-lg font-black text-white">
                {editingChore ? "Edit Chore" : "Add New Chore"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingChore(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChore} className="space-y-4 py-4">
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
                    <option value="biweekly" className="bg-cosmos-card">Every 2 Weeks (Biweekly)</option>
                    <option value="one_time" className="bg-cosmos-card">One-Time (Non-repeating)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Due Time (Optional)
                </label>
                <input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingChore(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  {editingChore ? "Save Changes" : "Save Chore"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
