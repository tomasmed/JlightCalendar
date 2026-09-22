"use client";

import React, { useState } from "react";
import { Star, CheckCircle, Circle, Plus, Sparkles } from "lucide-react";
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
}

const INITIAL_CHORES: ChoreItem[] = [
  {
    id: "c1",
    memberId: "m_leo",
    memberName: "Leo",
    memberColor: "#8b5cf6",
    title: "Make Bed & Tidy Room",
    points: 2,
    completed: true,
    frequency: "Daily Morning",
  },
  {
    id: "c2",
    memberId: "m_leo",
    memberName: "Leo",
    memberColor: "#8b5cf6",
    title: "Feed the Dog",
    points: 1,
    completed: false,
    frequency: "Daily 5:00 PM",
  },
  {
    id: "c3",
    memberId: "m_mia",
    memberName: "Mia",
    memberColor: "#f59e0b",
    title: "Put Away Backpack & Shoes",
    points: 1,
    completed: true,
    frequency: "After School",
  },
  {
    id: "c4",
    memberId: "m_mia",
    memberName: "Mia",
    memberColor: "#f59e0b",
    title: "Brush Teeth (2 mins)",
    points: 1,
    completed: false,
    frequency: "Nightly",
  },
  {
    id: "c5",
    memberId: "m_leo",
    memberName: "Leo",
    memberColor: "#8b5cf6",
    title: "Take Out Recycling Bin",
    points: 3,
    completed: false,
    frequency: "Every Monday",
  },
];

interface ChoresViewProps {
  accessMode: AccessMode;
}

export function ChoresView({ accessMode }: ChoresViewProps) {
  const [chores, setChores] = useState<ChoreItem[]>(INITIAL_CHORES);
  const [starBalances, setStarBalances] = useState({
    Leo: 18,
    Mia: 24,
  });

  const toggleChore = (choreId: string) => {
    setChores((prev) =>
      prev.map((c) => {
        if (c.id === choreId) {
          const nextCompleted = !c.completed;
          setStarBalances((stars) => ({
            ...stars,
            [c.memberName]:
              (stars[c.memberName as keyof typeof stars] || 0) +
              (nextCompleted ? c.points : -c.points),
          }));
          return { ...c, completed: nextCompleted };
        }
        return c;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-6 overflow-hidden">
      {/* Header & Rewards Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-starlight">
            Daily Chores & Routines
          </h2>
          <p className="text-xs text-slate-400">
            Check off completed tasks to earn family reward stars!
          </p>
        </div>

        {/* Kids Star Balances */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-sm shadow-purple-500/20">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-sm shadow-[#8b5cf6]" />
            <span className="text-xs font-bold text-slate-200">Leo:</span>
            <span className="flex items-center gap-1 font-black text-starlight text-sm">
              <Star className="w-4 h-4 fill-starlight text-starlight" />
              {starBalances.Leo}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-sm shadow-amber-500/20">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm shadow-[#f59e0b]" />
            <span className="text-xs font-bold text-slate-200">Mia:</span>
            <span className="flex items-center gap-1 font-black text-starlight text-sm">
              <Star className="w-4 h-4 fill-starlight text-starlight" />
              {starBalances.Mia}
            </span>
          </div>

          {accessMode !== "kid" && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-purple-500/20 transition">
              <Plus className="w-4 h-4" />
              <span>Add Chore</span>
            </button>
          )}
        </div>
      </div>

      {/* Chore List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
        {chores.map((chore) => (
          <div
            key={chore.id}
            onClick={() => toggleChore(chore.id)}
            className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-between select-none ${
              chore.completed
                ? "bg-cosmos-deep/40 border-cosmos-border/40 opacity-60"
                : "bg-cosmos-card/80 border-cosmos-border hover:border-purple-500/40 shadow-lg"
            }`}
          >
            <div className="flex items-center gap-4">
              {chore.completed ? (
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              ) : (
                <Circle className="w-7 h-7 text-slate-500 hover:text-slate-300" />
              )}
              <div>
                <span
                  className={`text-lg font-bold block ${
                    chore.completed
                      ? "line-through text-slate-500"
                      : "text-white"
                  }`}
                >
                  {chore.title}
                </span>
                <span className="text-xs text-slate-400">
                  {chore.frequency}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{
                  backgroundColor: `${chore.memberColor}22`,
                  color: chore.memberColor,
                }}
              >
                {chore.memberName}
              </span>
              <span className="flex items-center gap-1 text-xs font-black text-starlight bg-starlight/10 px-2.5 py-1 rounded-lg border border-starlight/30 shadow-sm shadow-starlight/20">
                <Star className="w-3.5 h-3.5 fill-starlight text-starlight" />
                +{chore.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
