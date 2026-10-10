"use client";

import React, { useEffect, useState } from "react";
import { getSavedTheme, AppTheme } from "@/lib/theme";

export function HalloweenWhimsy() {
  const [theme, setTheme] = useState<AppTheme | null>(null);

  useEffect(() => {
    const update = () => {
      const current = document.documentElement.getAttribute("data-theme") as AppTheme || getSavedTheme();
      setTheme(current);
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  if (theme !== "halloween") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      {/* Top Left Floating Spider with Silk Thread */}
      <div className="absolute top-0 left-8 sm:left-16 flex flex-col items-center animate-bounce duration-[4000ms]">
        <div className="w-[1px] h-12 sm:h-16 bg-gradient-to-b from-purple-500/40 via-orange-500/40 to-white/60" />
        <span className="text-xl sm:text-2xl filter drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)]">
          🕷️
        </span>
      </div>

      {/* Top Right Whispering Ghost */}
      <div className="absolute top-3 right-28 sm:right-48 opacity-75 animate-pulse duration-[3000ms]">
        <span className="text-2xl sm:text-3xl filter drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]">
          👻
        </span>
      </div>

      {/* Center Background Ambient Flying Bats */}
      <div className="absolute top-24 left-[15%] opacity-35 hover:opacity-60 transition text-sm sm:text-base animate-pulse">
        🦇
      </div>
      <div className="absolute top-16 right-[22%] opacity-30 text-xs sm:text-sm">
        🦇
      </div>
      <div className="absolute bottom-20 left-[8%] opacity-25 text-sm sm:text-base">
        🦇
      </div>

      {/* Bottom Corner Glowing Jack-O'-Lantern Accent */}
      <div className="absolute -bottom-2 -right-2 opacity-40 sm:opacity-70 filter drop-shadow-[0_0_16px_rgba(249,115,22,0.5)]">
        <span className="text-4xl sm:text-5xl">🎃</span>
      </div>

      {/* Bottom Left Cauldron/Witch Hat Accent */}
      <div className="absolute -bottom-1 -left-1 opacity-40 sm:opacity-65 filter drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]">
        <span className="text-3xl sm:text-4xl">🧙</span>
      </div>
    </div>
  );
}
