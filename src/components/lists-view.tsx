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
  const [activeCategory, setActiveCategory] = useState<string>("All");

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
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white">Shared Grocery List</h2>
          <p className="text-xs text-slate-400">
            Real-time grocery sync between phone and wall display.
          </p>
        </div>

        {items.some((i) => i.completed) && accessMode !== "kid" && (
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-850 text-xs font-bold text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Add Item Form (Disabled in Kid mode) */}
      {accessMode !== "kid" && (
        <form onSubmit={addItem} className="flex gap-2 py-4">
          <input
            type="text"
            placeholder="Add an item to the list (e.g. Eggs, Coffee, Apples)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            className="h-12 px-5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
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
                ? "bg-slate-900/40 border-slate-800/40 opacity-60"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <Circle className="w-6 h-6 text-slate-600 hover:text-slate-400" />
              )}
              <span
                className={`text-base font-medium ${
                  item.completed ? "line-through text-slate-500" : "text-slate-100"
                }`}
              >
                {item.title}
              </span>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 font-semibold">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
