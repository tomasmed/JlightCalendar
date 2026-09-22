"use client";

import React, { useState, useEffect } from "react";
import { CloudSun, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";

interface ScreensaverViewProps {
  onDismiss: () => void;
}

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",
];

export function ScreensaverView({ onDismiss }: ScreensaverViewProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      setDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Rotate photo every 12 seconds
    const photoInterval = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % SAMPLE_PHOTOS.length);
    }, 12000);

    return () => {
      clearInterval(interval);
      clearInterval(photoInterval);
    };
  }, []);

  return (
    <div
      onClick={onDismiss}
      className="relative flex-1 w-full h-full overflow-hidden bg-black cursor-pointer select-none"
    >
      {/* Background Image with Ken Burns Effect */}
      <div
        key={photoIndex}
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 animate-pulse"
        style={{
          backgroundImage: `url(${SAMPLE_PHOTOS[photoIndex]})`,
          filter: "brightness(0.75)",
        }}
      />

      {/* Subtle Vignette Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50" />

      {/* Top Left: Tap to return */}
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-slate-300 text-xs font-semibold border border-white/10">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Tap screen to wake</span>
      </div>

      {/* Bottom Overlay: Time, Date, Weather, Upcoming Event */}
      <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col">
          <span className="text-7xl md:text-8xl font-black text-white tracking-tight drop-shadow-lg tabular-nums">
            {time}
          </span>
          <span className="text-xl md:text-2xl font-bold text-slate-200 drop-shadow-md">
            {date}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Weather Widget */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-white w-fit">
            <CloudSun className="w-6 h-6 text-amber-400" />
            <div>
              <span className="text-lg font-bold">72°F</span>
              <span className="text-xs text-slate-300 ml-2">Mostly Sunny</span>
            </div>
          </div>

          {/* Next Upcoming Event */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-white">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            <div>
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider block">
                Next Event: 4:30 PM
              </span>
              <span className="text-sm font-bold">Leo Soccer Practice (Community Field 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
