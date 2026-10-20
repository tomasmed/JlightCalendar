"use client";

import React, { useState, useEffect } from "react";
import { Utensils, Plus, ShoppingCart, Check, Sparkles, User, X, Trash2 } from "lucide-react";
import { AccessMode } from "./kiosk-header";
import { AgentProvenanceBadge } from "./agent-badge";

interface MealPlanItem {
  id: string;
  planDate: string; // YYYY-MM-DD
  mealType: string;
  title: string;
  notes?: string | null;
  recipeUrl?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  memberColor?: string | null;
  createdByAgentId?: string | null;
  agent?: any;
}

interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

interface MealsViewProps {
  accessMode: AccessMode;
  activeGalaxyId?: string;
}

export function MealsView({ accessMode, activeGalaxyId }: MealsViewProps) {
  const [meals, setMeals] = useState<MealPlanItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [addedGrocery, setAddedGrocery] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Add Meal Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newMealType, setNewMealType] = useState("dinner");
  const [newMemberId, setNewMemberId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const fetchMeals = async () => {
    try {
      const url = activeGalaxyId
        ? `/api/meals?galaxyId=${activeGalaxyId}`
        : "/api/meals";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals || []);
        if (data.members) {
          setMembers(data.members);
          if (!newMemberId && data.members.length > 0) {
            setNewMemberId(data.members[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch meal plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, [activeGalaxyId]);

  const handleAddToGrocery = async (mealTitle: string, memberId?: string | null) => {
    setAddedGrocery((prev) => ({ ...prev, [mealTitle]: true }));

    try {
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-to-grocery",
          title: mealTitle,
          memberId: memberId || null,
          galaxyId: activeGalaxyId,
        }),
      });
    } catch (err) {
      console.error("Failed to add meal to grocery:", err);
    }

    setTimeout(() => {
      setAddedGrocery((prev) => ({ ...prev, [mealTitle]: false }));
    }, 3000);
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          planDate: newDate,
          mealType: newMealType,
          memberId: newMemberId || null,
          notes: newNotes.trim() || null,
          galaxyId: activeGalaxyId,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewNotes("");
        setIsAddModalOpen(false);
        fetchMeals();
      }
    } catch (err) {
      console.error("Failed to save meal:", err);
    }
  };

  const formatMealDay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        dayName: dt.toLocaleDateString([], { weekday: "long" }),
        dateFormatted: dt.toLocaleDateString([], { month: "short", day: "numeric" }),
      };
    } catch {
      return { dayName: dateStr, dateFormatted: "" };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 md:pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-starlight">
            Weekly Meal Planner
          </h2>
          <p className="text-xs text-slate-400">
            Backed to database — plan meals, assign family chefs, and sync grocery ingredients.
          </p>
        </div>

        {accessMode === "admin" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-purple-500/20 transition min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Meal</span>
          </button>
        )}
      </div>

      {/* Meals List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading meals...</div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Utensils className="w-8 h-8 mx-auto mb-2 text-purple-400 opacity-60" />
            <p className="font-semibold text-sm">No meals scheduled yet!</p>
          </div>
        ) : (
          meals.map((meal) => {
            const { dayName, dateFormatted } = formatMealDay(meal.planDate);
            const isAdded = !!addedGrocery[meal.title];

            return (
              <div
                key={meal.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-cosmos-card/80 border border-cosmos-border flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 shadow-lg backdrop-blur-md"
              >
                {/* Day & Date Header */}
                <div className="w-full md:w-36 flex items-baseline md:flex-col justify-between md:justify-start">
                  <span className="text-base sm:text-lg font-black text-white block">
                    {dayName}
                  </span>
                  <span className="text-xs font-bold text-purple-300">
                    {dateFormatted}
                  </span>
                </div>

                {/* Meal Details & Assigned Cook */}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-200">
                      {meal.mealType}
                    </span>
                    <span className="text-base font-bold text-white">
                      {meal.title}
                    </span>
                    {meal.memberName && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${meal.memberColor}20`,
                          borderColor: `${meal.memberColor}50`,
                          color: meal.memberColor || "#8b5cf6",
                        }}
                      >
                        <User className="w-3 h-3" />
                        <span>Chef: {meal.memberName}</span>
                      </span>
                    )}
                    {meal.agent && (
                      <AgentProvenanceBadge agent={meal.agent} compact />
                    )}
                  </div>
                  {meal.notes && (
                    <p className="text-xs text-slate-400 italic">{meal.notes}</p>
                  )}
                </div>

                {/* Actions: Add ingredients to grocery list + Delete */}
                {accessMode !== "kid" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddToGrocery(meal.title, meal.memberId)}
                      disabled={isAdded}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition min-h-[44px] cursor-pointer shrink-0 ${
                        isAdded
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : "bg-cosmos-surface border-cosmos-border text-slate-300 hover:text-white hover:border-purple-500/50"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Added to List!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 text-purple-400" />
                          <span>+ Grocery List</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this meal plan?")) return;
                        try {
                          const res = await fetch(`/api/meals?id=${encodeURIComponent(meal.id)}`, {
                            method: "DELETE",
                          });
                          if (res.ok) fetchMeals();
                        } catch (err) {
                          console.error("Failed to delete meal:", err);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-cosmos-surface min-h-[44px] min-w-[44px] flex items-center justify-center transition"
                      title="Delete meal plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Meal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-cosmos-border">
              <h3 className="text-lg font-black text-white">Add Meal Plan</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeal} className="space-y-4 py-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Meal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Homemade Tacos, Spaghetti Bolognese..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Meal Type
                  </label>
                  <select
                    value={newMealType}
                    onChange={(e) => setNewMealType(e.target.value)}
                    className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="dinner" className="bg-cosmos-card">Dinner</option>
                    <option value="lunch" className="bg-cosmos-card">Lunch</option>
                    <option value="breakfast" className="bg-cosmos-card">Breakfast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Assigned Chef / Family Member
                </label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="" className="bg-cosmos-card">None (Unassigned)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-cosmos-card">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Notes / Recipe Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Side of asparagus, preheat oven to 400..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
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
                  Save Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
