"use client";

import React, { useState } from "react";
import { Shield, User, Baby, X, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { AccessMode } from "./kiosk-header";

interface ModeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: AccessMode;
  onSelectMode: (mode: AccessMode) => void;
}

export function ModeSwitcherModal({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
}: ModeSwitcherModalProps) {
  const [targetMode, setTargetMode] = useState<AccessMode>(currentMode);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const DEFAULT_PIN = "1234";

  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setPin("");
      setError(null);
      return;
    }
    if (val === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      setError(null);
      return;
    }
    if (pin.length < 4) {
      setPin((prev) => prev + val);
      setError(null);
    }
  };

  const handleApply = (modeToApply: AccessMode) => {
    const requiresPin = modeToApply === "admin" || (currentMode === "kid" && modeToApply !== "kid");

    if (requiresPin) {
      if (pin !== DEFAULT_PIN) {
        setError("Invalid Parent PIN. (Default: 1234)");
        return;
      }
    }

    onSelectMode(modeToApply);
    setPin("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cosmos-border">
          <div>
            <h2 className="text-xl font-bold text-white">Access Control Mode</h2>
            <p className="text-xs text-slate-400">
              Select who is currently using this wall display.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Options */}
        <div className="grid grid-cols-3 gap-3 my-5">
          {/* Standard */}
          <button
            onClick={() => {
              setTargetMode("standard");
              setError(null);
            }}
            className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition ${
              targetMode === "standard"
                ? "bg-blue-600/20 border-cyan-500 text-starlight-cyan shadow-md shadow-cyan-500/20"
                : "bg-cosmos-surface border-cosmos-border text-slate-300 hover:bg-cosmos-cardHover"
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-bold">Standard</span>
          </button>

          {/* Kid */}
          <button
            onClick={() => {
              setTargetMode("kid");
              setError(null);
            }}
            className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition ${
              targetMode === "kid"
                ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/20"
                : "bg-cosmos-surface border-cosmos-border text-slate-300 hover:bg-cosmos-cardHover"
            }`}
          >
            <Baby className="w-6 h-6" />
            <span className="text-xs font-bold">Kid Mode</span>
          </button>

          {/* Admin */}
          <button
            onClick={() => {
              setTargetMode("admin");
              setError(null);
            }}
            className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition ${
              targetMode === "admin"
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20"
                : "bg-cosmos-surface border-cosmos-border text-slate-300 hover:bg-cosmos-cardHover"
            }`}
          >
            <Shield className="w-6 h-6" />
            <span className="text-xs font-bold">Admin</span>
          </button>
        </div>

        {/* Mode Details Description */}
        <div className="bg-cosmos-void/80 p-3 rounded-xl border border-cosmos-border text-xs text-slate-300 mb-4">
          {targetMode === "standard" && (
            <span>
              <strong className="text-starlight-cyan">Standard Mode:</strong> Everyday family view. Allows viewing schedules, checking chores, and adding grocery items.
            </span>
          )}
          {targetMode === "kid" && (
            <span>
              <strong className="text-purple-300">Kid Mode:</strong> Kiosk-safe mode. Kids can check off their own chores and view schedules. All editing and settings are locked.
            </span>
          )}
          {targetMode === "admin" && (
            <span>
              <strong className="text-emerald-300">Admin Mode:</strong> Unlocks calendar sync settings, member profiles, and meal planning configurations.
            </span>
          )}
        </div>

        {/* PIN Entry */}
        {(targetMode === "admin" || (currentMode === "kid" && targetMode !== "kid")) && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-starlight">
                <Lock className="w-3.5 h-3.5" /> Enter 4-Digit Parent PIN
              </span>
              <span className="font-mono text-slate-500">Default: 1234</span>
            </div>

            {/* PIN Display Dots */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > idx
                      ? "bg-starlight border-amber-300 scale-110 shadow-lg shadow-starlight/50"
                      : "border-slate-700 bg-cosmos-surface"
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Large Touch Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className="h-12 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border font-bold text-lg text-white active:scale-95 transition"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-cosmos-border font-medium text-slate-300 hover:bg-cosmos-surface transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => handleApply(targetMode)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white shadow-lg shadow-purple-500/25 transition text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Mode
          </button>
        </div>
      </div>
    </div>
  );
}
