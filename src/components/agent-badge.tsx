"use client";

import React, { useMemo } from "react";
import { decodeStencil16ToGrid } from "@/lib/agent-types";
import type { AgentBadgeInfo } from "@/lib/agent-types";

interface Stencil16IconProps {
  stencilMap?: string | null;
  color?: string;
  size?: number;
  className?: string;
}

export function Stencil16Icon({
  stencilMap,
  color = "#06b6d4",
  size = 18,
  className = "",
}: Stencil16IconProps) {
  const grid = useMemo(() => {
    if (!stencilMap) return null;
    try {
      return decodeStencil16ToGrid(stencilMap);
    } catch {
      return null;
    }
  }, [stencilMap]);

  if (!grid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={`inline-block ${className}`}
        style={{ color }}
      >
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`inline-block pixelated ${className}`}
      style={{ imageRendering: "pixelated", shapeRendering: "crispEdges" }}
    >
      {grid.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width="1"
              height="1"
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

interface AgentProvenanceBadgeProps {
  agent?: AgentBadgeInfo | null;
  compact?: boolean;
  className?: string;
}

export function AgentProvenanceBadge({
  agent,
  compact = false,
  className = "",
}: AgentProvenanceBadgeProps) {
  if (!agent) return null;

  const isBuffed = agent.status === "revoked";
  const displayRune = isBuffed ? "∅" : agent.rune || "◈";
  const badgeColor = isBuffed ? "#64748b" : agent.color || "#06b6d4";

  if (compact) {
    return (
      <span
        title={
          isBuffed
            ? `Sprayed by ${agent.agentName} (Buffed ∅ / Revoked)`
            : `Agent Envoy: ${agent.agentName}${agent.crew ? ` (${agent.crew})` : ""}`
        }
        className={`inline-flex items-center justify-center rounded px-1 text-[11px] font-mono leading-none ${
          isBuffed
            ? "bg-slate-800/80 text-slate-400 line-through border border-slate-700/60"
            : "bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 shadow-sm"
        } ${className}`}
        style={{ borderColor: isBuffed ? undefined : `${badgeColor}40` }}
      >
        {agent.tagMode === "stencil16" && agent.stencilMap ? (
          <Stencil16Icon
            stencilMap={agent.stencilMap}
            color={badgeColor}
            size={12}
            className="mr-0.5"
          />
        ) : (
          <span className="mr-0.5 font-bold" style={{ color: badgeColor }}>
            {displayRune}
          </span>
        )}
        <span className="max-w-[70px] truncate">{agent.agentName}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isBuffed
          ? "bg-slate-800/70 text-slate-400 border border-slate-700 line-through"
          : "bg-slate-900/80 text-slate-200 border border-slate-700/80 shadow"
      } ${className}`}
      style={{
        boxShadow: isBuffed
          ? undefined
          : `0 0 10px -3px ${badgeColor}33`,
      }}
    >
      {agent.tagMode === "stencil16" && agent.stencilMap ? (
        <Stencil16Icon stencilMap={agent.stencilMap} color={badgeColor} size={14} />
      ) : (
        <span className="font-bold text-sm leading-none" style={{ color: badgeColor }}>
          {displayRune}
        </span>
      )}
      <span className="truncate max-w-[100px]">{agent.agentName}</span>
      {agent.crew && !isBuffed && (
        <span className="text-[10px] text-slate-400 opacity-80 hidden sm:inline">
          {agent.crew}
        </span>
      )}
    </span>
  );
}
