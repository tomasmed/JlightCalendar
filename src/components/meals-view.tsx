"use client";

import React, { useState } from "react";
import { Utensils, Plus, ShoppingCart, Check, Sparkles } from "lucide-react";
import { AccessMode } from "./kiosk-header";

interface MealDay {
  day: string;
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

const INITIAL_MEALS: MealDay[] = [
  {
    day: "Monday",
    date: "Sep 21",
    breakfast: "Oatmeal with Blueberries",
    lunch: "Turkey Avocado Wraps",
    dinner: "Homemade Beef Tacos & Guacamole",
  },
  {
    day: "Tuesday",
    date: "Sep 22",
    breakfast: "Scrambled Eggs & Toast",
    lunch: "Leftover Tacos",
    dinner: "Grilled Salmon & Asparagus",
  },
  {
    day: "Wednesday",
    date: "Sep 23",
    breakfast: "Greek Yogurt Parfait",
    lunch: "Chicken Caesar Salad",
    dinner: "Spaghetti Bolognese with Garlic Bread",
  },
  {
    day: "Thursday",
    date: "Sep 24",
    breakfast: "Pancakes & Strawberries",
    lunch: "Tomato Basil Soup & Grilled Cheese",
    dinner: "Slow-Cooker Pulled Pork Sandwiches",
  },
  {
    day: "Friday",
    date: "Sep 25",
    breakfast: "Green Smoothie & Granola",
    lunch: "Pulled Pork Sliders",
    dinner: "Family Pizza Night (Build Your Own)",
  },
];

interface MealsViewProps {
  accessMode: AccessMode;
}

export function MealsView({ accessMode }: MealsViewProps) {
  const [meals] = useState<MealDay[]>(INITIAL_MEALS);
  const [addedGrocery, setAddedGrocery] = useState<Record<string, boolean>>({});

  const handleAddToGrocery = (dinnerTitle: string) => {
    setAddedGrocery((prev) => ({ ...prev, [dinnerTitle]: true }));
    setTimeout(() => {
      setAddedGrocery((prev) => ({ ...prev, [dinnerTitle]: false }));
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cosmos-void/90 p-6 overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-cosmos-border">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-starlight">
            Weekly Meal Planner
          </h2>
          <p className="text-xs text-slate-400">
            Plan dinners and send ingredients straight to the family grocery list.
          </p>
        </div>

        {accessMode === "admin" && (
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-purple-500/20 transition">
            <Plus className="w-4 h-4" />
            <span>Edit Schedule</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
        {meals.map((meal) => {
          const isAdded = !!addedGrocery[meal.dinner];

          return (
            <div
              key={meal.day}
              className="p-4 rounded-2xl bg-cosmos-card/80 border border-cosmos-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-md"
            >
              <div className="w-36">
                <span className="text-lg font-black text-white block">
                  {meal.day}
                </span>
                <span className="text-xs text-starlight font-bold">{meal.date}</span>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-cosmos-surface/80 p-2.5 rounded-xl border border-cosmos-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Breakfast
                  </span>
                  <span className="text-xs text-slate-200 font-medium">
                    {meal.breakfast}
                  </span>
                </div>
                <div className="bg-cosmos-surface/80 p-2.5 rounded-xl border border-cosmos-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Lunch
                  </span>
                  <span className="text-xs text-slate-200 font-medium">
                    {meal.lunch}
                  </span>
                </div>
                <div className="bg-cosmos-surface/90 p-2.5 rounded-xl border border-purple-500/40 shadow-sm shadow-purple-500/20">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 block flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-starlight" />
                    Dinner
                  </span>
                  <span className="text-xs text-white font-bold">
                    {meal.dinner}
                  </span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleAddToGrocery(meal.dinner)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isAdded
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-cosmos-surface border border-cosmos-border text-slate-300 hover:bg-cosmos-cardHover hover:text-white"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 text-starlight" />
                      <span>Add Ingredients</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
