"use client";

import React, { useState } from "react";
import { Utensils, Plus, ShoppingCart, Check } from "lucide-react";
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white">Weekly Meal Planner</h2>
          <p className="text-xs text-slate-400">
            Plan dinners and send ingredients straight to the family grocery list.
          </p>
        </div>

        {accessMode === "admin" && (
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white shadow-lg shadow-blue-500/20 transition">
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
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="w-36">
                <span className="text-lg font-black text-white block">
                  {meal.day}
                </span>
                <span className="text-xs text-slate-400">{meal.date}</span>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Breakfast
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {meal.breakfast}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Lunch
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {meal.lunch}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-blue-500/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
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
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 text-slate-400" />
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
