"use client";

import React, { useState } from "react";
import { Plus, CheckCircle, Circle, Trash2, ShoppingBag } from "lucide-react";
import { AccessMode } from "./kiosk-header";

interface ListItem {
  id: string;
  title: string;
  category: string;
  completed: boolean;
}

const INITIAL_GROCERIES: ListItem[] = [
  { id: "g1", title: "Whole Milk (1 Gallon)", category: "Dairy", completed: false },
  { id: "g2", title: "Avocados (4-pack)", category: "Produce", completed: false },
  { id: "g3", title: "Corn Tortillas", category: "Pantry", completed: true },
  { id: "g4", title: "Ground Turkey (2 lbs)", category: "Meat", completed: false },
  { id: "g5", title: "Cheddar Cheese Block", category: "Dairy", completed: false },
  { id: "g6", title: "Bananas", category: "Produce", completed: true },
];

interface ListsViewProps {
  accessMode: AccessMode;
}

export function ListsView({ accessMode }: ListsViewProps) {
  const [items, setItems] = useState<ListItem[]>(INITIAL_GROCERIES);
  const [newTitle, setNewTitle] = useState("");

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newItem: ListItem = {
      id: `g_${Date.now()}`,
      title: newTitle.trim(),
      category: "General",
      completed: false,
    };
    setItems((prev) => [newItem, ...prev]);
    setNewTitle("");
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((it) => !it.completed));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-starlight">
            Shared Grocery List
          </h2>
          <p className="text-xs text-slate-400">
            Real-time grocery sync between phone and wall display.
          </p>
        </div>

        {items.some((i) => i.completed) && accessMode !== "kid" && (
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cosmos-surface border border-cosmos-border text-xs font-bold text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Add Item Form */}
      {accessMode !== "kid" && (
        <form onSubmit={addItem} className="flex gap-2 py-4">
          <input
            type="text"
            placeholder="Add an item to the list (e.g. Eggs, Coffee, Apples)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 h-12 bg-cosmos-surface border border-cosmos-border rounded-xl px-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
          <button
            type="submit"
            className="h-12 px-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-white rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      )}

      {/* List Items */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`cursor-pointer p-3.5 rounded-xl border transition flex items-center justify-between select-none ${
              item.completed
                ? "bg-cosmos-deep/40 border-cosmos-border/40 opacity-60"
                : "bg-cosmos-card/80 border-cosmos-border hover:border-purple-500/40 shadow-md"
            }`}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <Circle className="w-6 h-6 text-slate-500 hover:text-slate-300" />
              )}
              <span
                className={`text-base font-medium ${
                  item.completed ? "line-through text-slate-500" : "text-slate-100"
                }`}
              >
                {item.title}
              </span>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-md bg-cosmos-surface border border-cosmos-border text-slate-300 font-semibold">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
