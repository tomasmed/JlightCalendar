"use client";

import React, { useState, useEffect } from "react";
import { Moon, Sparkles } from "lucide-react";

interface NightSleepOverlayProps {
  isSleeping: boolean;
  onWake: () => void;
}

export function NightSleepOverlay({
  isSleeping,
  onWake,
}: NightSleepOverlayProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isSleeping) return;

    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    // Pixel shifting every 10 minutes to prevent OLED/LCD burn-in
    const shiftInterval = setInterval(() => {
      const randomX = Math.floor(Math.random() * 8) - 4; // -4 to +4 px
      const randomY = Math.floor(Math.random() * 8) - 4;
      setOffset({ x: randomX, y: randomY });
    }, 600000);

    return () => {
      clearInterval(interval);
      clearInterval(shiftInterval);
    };
  }, [isSleeping]);

  if (!isSleeping) return null;

  return (
    <div
      onClick={onWake}
      className="fixed inset-0 z-50 bg-black cursor-pointer flex flex-col items-center justify-center select-none"
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: "transform 1s ease",
        }}
        className="flex flex-col items-center gap-2 text-center opacity-30 hover:opacity-50 transition-opacity"
      >
        <Moon className="w-8 h-8 text-blue-400 mb-2 animate-pulse" />
        <span className="text-7xl font-extralight tracking-widest text-slate-200 tabular-nums">
          {time}
        </span>
        <span className="text-sm font-medium tracking-widest uppercase text-slate-400">
          {date}
        </span>
        <span className="text-xs text-slate-600 mt-4">
          Tap screen anywhere to wake
        </span>
      </div>
    </div>
  );
}
