"use client";

import React, { useState, useEffect } from "react";
import { Plus, CheckCircle, Circle, Trash2, ShoppingBag, User } from "lucide-react";
import { AccessMode } from "./kiosk-header";
import { AgentProvenanceBadge } from "./agent-badge";
import { adaptMemberColor, useActiveTheme } from "@/lib/theme";

interface ListItem {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  addedByMemberId?: string | null;
  addedByName?: string | null;
  addedByColor?: string | null;
  createdByAgentId?: string | null;
  agent?: any;
}

interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

interface ListsViewProps {
  accessMode: AccessMode;
  activeGalaxyId?: string;
}

export function ListsView({ accessMode, activeGalaxyId }: ListsViewProps) {
  const activeTheme = useActiveTheme();
  const [items, setItems] = useState<ListItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [addedById, setAddedById] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const gidParam = activeGalaxyId ? `galaxyId=${activeGalaxyId}&` : "";
      const url =
        selectedMemberId === "all"
          ? `/api/lists?${gidParam}type=grocery`
          : `/api/lists?${gidParam}type=grocery&memberId=${selectedMemberId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.members) {
          setMembers(data.members);
          if (!addedById && data.members.length > 0) {
            setAddedById(data.members[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch list items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedMemberId, activeGalaxyId]);

  const toggleItem = async (id: string, currentCompleted: boolean) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !currentCompleted } : it))
    );

    try {
      await fetch("/api/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentCompleted }),
      });
    } catch (err) {
      console.error("Failed to toggle item:", err);
      fetchItems();
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          addedByMemberId: addedById || null,
          listType: "grocery",
          galaxyId: activeGalaxyId,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const clearCompleted = async () => {
    setItems((prev) => prev.filter((it) => !it.completed));
    try {
      const gidParam = activeGalaxyId ? `&galaxyId=${activeGalaxyId}` : "";
      await fetch(`/api/lists?action=clear-completed${gidParam}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to clear completed items:", err);
      fetchItems();
    }
  };

  const deleteSingle = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await fetch(`/api/lists?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete item:", err);
      fetchItems();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 md:pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-cosmos-text">
            Shared List
          </h2>
          <p className="text-xs text-cosmos-muted">
            Groceries, packing items, and shared to-dos for everyone.
          </p>
        </div>

        {items.some((i) => i.completed) && accessMode !== "kid" && (
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-cosmos-muted hover:text-rose-400 hover:border-rose-500/30 transition min-h-[44px]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Member Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 max-w-full">
        <button
          onClick={() => setSelectedMemberId("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[40px] shrink-0 ${
            selectedMemberId === "all"
              ? "theme-focus-pill font-extrabold"
              : "bg-cosmos-surface border border-cosmos-border text-cosmos-muted hover:text-cosmos-text"
          }`}
        >
          Everyone
        </button>
        {members.map((m) => {
          const isSelected = selectedMemberId === m.id;
          const memberColor = adaptMemberColor(m.color, activeTheme);
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[40px] shrink-0 border ${
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
                className="w-2.5 h-2.5 rounded-[3px]"
                style={{ backgroundColor: memberColor }}
              />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Add Item Form */}
      {accessMode !== "kid" && (
        <form onSubmit={addItem} className="flex flex-col sm:flex-row gap-2 py-2">
          <input
            type="text"
            placeholder="Add an item (e.g. Organic Eggs, Sourdough, Apples)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-cosmos-text text-sm placeholder:text-cosmos-muted/70 focus:outline-none focus:border-starlight transition"
          />
          <div className="flex gap-2">
            <select
              value={addedById}
              onChange={(e) => setAddedById(e.target.value)}
              className="h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-3 text-cosmos-text text-xs font-bold focus:outline-none focus:border-starlight shrink-0"
              title="Added by"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-cosmos-card">
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-12 px-5 theme-focus-pill font-bold rounded-xl text-xs flex items-center gap-2 transition min-w-[48px] justify-center cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
      )}

      {/* List Items */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
        {loading ? (
          <div className="text-center py-12 text-cosmos-muted">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-cosmos-muted">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-starlight opacity-60" />
            <p className="font-semibold text-sm">No grocery items right now!</p>
          </div>
        ) : (
          items.map((item) => {
            const itemColor = adaptMemberColor(item.addedByColor || "#8b5cf6", activeTheme);
            return (
            <div
              key={item.id}
              className={`p-3 sm:p-4 rounded-2xl border theme-card-nmm transition-all flex items-center justify-between ${
                item.completed
                  ? "bg-cosmos-deep/40 border-cosmos-border/50 opacity-60"
                  : "border-cosmos-border shadow-md"
              }`}
              style={{
                borderLeftWidth: "5px",
                borderLeftColor: itemColor,
                background: item.completed
                  ? undefined
                  : `linear-gradient(90deg, ${itemColor}1F 0%, rgb(var(--cosmos-card)) 85%)`,
              }}
            >
              <div
                onClick={() => toggleItem(item.id, item.completed)}
                className="flex items-center gap-3 flex-1 cursor-pointer select-none"
              >
                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {item.completed ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-cosmos-muted hover:text-cosmos-text" />
                  )}
                </div>
                <div>
                  <span
                    className={`text-sm sm:text-base font-bold block ${
                      item.completed
                        ? "line-through text-cosmos-muted"
                        : "text-cosmos-text"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.addedByName && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-cosmos-muted">
                      <span
                        className="w-2 h-2 rounded-[2px]"
                        style={{ backgroundColor: itemColor }}
                      />
                      <span>Added by {item.addedByName}</span>
                      {item.agent && (
                        <AgentProvenanceBadge agent={item.agent} compact />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {accessMode !== "kid" && (
                <button
                  onClick={() => deleteSingle(item.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-cosmos-muted hover:text-rose-400 hover:bg-cosmos-surface transition"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
