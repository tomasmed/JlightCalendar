"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Plus,
  Shield,
  Bot,
  Terminal,
  Check,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  Ban,
  Clock,
  Activity,
  User,
  Sliders,
  ExternalLink,
} from "lucide-react";
import {
  STENCIL_PRESETS,
  encodeGridToStencil16,
  decodeStencil16ToGrid,
} from "@/lib/agent-types";
import type { AgentBadgeInfo, AgentScope, AgentTagMode } from "@/lib/agent-types";
import { Stencil16Icon, AgentProvenanceBadge } from "./agent-badge";

interface InhabitantOption {
  id: string;
  name: string;
  color?: string;
  role?: string;
}

interface AgentWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  galaxyId?: string;
  inhabitants: InhabitantOption[];
  initialTab?: "wall" | "mint" | "claim";
  initialClaimCode?: string;
}

interface AgentKeyRecord extends AgentBadgeInfo {
  memberDisplayName: string;
  memberColor: string;
  memberAvatarIcon?: string;
  keyPrefix: string;
  createdAt: string;
}

export function AgentWallModal({
  isOpen,
  onClose,
  galaxyId,
  inhabitants = [],
  initialTab = "wall",
  initialClaimCode = "",
}: AgentWallModalProps) {
  // 1. ALL React hooks declared unconditionally at the very top of component function
  const [activeTab, setActiveTab] = useState<"wall" | "mint" | "claim">(initialTab);
  const [agents, setAgents] = useState<AgentKeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mint Form State
  const [mintMemberId, setMintMemberId] = useState(inhabitants[0]?.id || "");
  const [mintName, setMintName] = useState("");
  const [mintCrew, setMintCrew] = useState("");
  const [mintDirective, setMintDirective] = useState("");
  const [mintScope, setMintScope] = useState<AgentScope>("standard");
  const [mintTagMode, setMintTagMode] = useState<AgentTagMode>("rune");
  const [mintRune, setMintRune] = useState("◈");
  const [mintColor, setMintColor] = useState("#06b6d4");
  const [pixelGrid, setPixelGrid] = useState<boolean[][]>(() =>
    Array(16)
      .fill(null)
      .map(() => Array(16).fill(false))
  );
  const [mintSuccessToken, setMintSuccessToken] = useState<string | null>(null);

  // Claim Form State (Pull Flow)
  const [claimUserCode, setClaimUserCode] = useState(initialClaimCode);
  const [claimPreview, setClaimPreview] = useState<any>(null);
  const [claimMemberId, setClaimMemberId] = useState(inhabitants[0]?.id || "");
  const [claimScope, setClaimScope] = useState<AgentScope>("standard");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState("");

  // Sync initial props
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialClaimCode) setClaimUserCode(initialClaimCode);
    if (inhabitants.length > 0 && !mintMemberId) {
      setMintMemberId(inhabitants[0].id);
      setClaimMemberId(inhabitants[0].id);
    }
  }, [initialTab, initialClaimCode, inhabitants, mintMemberId]);

  const loadAgents = useCallback(async () => {
    if (!galaxyId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/agent/keys?galaxyId=${encodeURIComponent(galaxyId)}`);
      if (!res.ok) {
        throw new Error("Failed to load galaxy agent keys");
      }
      const data = await res.json();
      setAgents(data.keys || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  }, [galaxyId]);

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen, loadAgents]);

  // Handle Claim code lookup when user types 8 chars (BOT-XXXX)
  useEffect(() => {
    const cleanCode = claimUserCode.trim().toUpperCase();
    if (cleanCode.length >= 8 && cleanCode.startsWith("BOT-")) {
      let isMounted = true;
      setClaimLoading(true);
      fetch(`/api/agent/connect/approve?userCode=${encodeURIComponent(cleanCode)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted) {
            setClaimPreview(data);
            if (data?.requestedScope) setClaimScope(data.requestedScope);
          }
        })
        .catch(() => {
          if (isMounted) setClaimPreview(null);
        })
        .finally(() => {
          if (isMounted) setClaimLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setClaimPreview(null);
    }
  }, [claimUserCode]);

  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintName.trim() || !mintMemberId) return;
    setLoading(true);
    setErrorMessage("");

    try {
      const stencilMap =
        mintTagMode === "stencil16" ? encodeGridToStencil16(pixelGrid) : null;

      const res = await fetch("/api/agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galaxyId,
          memberId: mintMemberId,
          agentName: mintName.trim(),
          crew: mintCrew.trim() || null,
          directive: mintDirective.trim() || null,
          scope: mintScope,
          tagMode: mintTagMode,
          rune: mintRune,
          color: mintColor,
          stencilMap,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mint agent key");
      }

      setMintSuccessToken(data.token);
      loadAgents();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to mint agent key.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimUserCode || !claimMemberId) return;
    setClaimLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/agent/connect/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCode: claimUserCode.trim().toUpperCase(),
          galaxyId,
          memberId: claimMemberId,
          scope: claimScope,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve connection");
      }

      setClaimSuccessMessage(`Approved ${data.agentName} acting as ${data.boundMember}!`);
      loadAgents();
      setTimeout(() => {
        setActiveTab("wall");
        setClaimSuccessMessage("");
        setClaimUserCode("");
        setClaimPreview(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to approve connection.");
    } finally {
      setClaimLoading(false);
    }
  };

  const handleBuff = async (keyId: string) => {
    if (!confirm("Buff this agent? Its access will be immediately revoked (∅), but historical provenance on calendar events and lists will be preserved.")) {
      return;
    }
    try {
      const res = await fetch("/api/agent/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId, action: "buff" }),
      });
      if (res.ok) {
        loadAgents();
      }
    } catch (err) {
      console.error("Failed to buff agent:", err);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm("Permanently delete this agent key record?")) return;
    try {
      const res = await fetch(`/api/agent/keys?id=${encodeURIComponent(keyId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAgents();
      }
    } catch (err) {
      console.error("Failed to delete agent:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePixel = (r: number, c: number) => {
    setPixelGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = !next[r][c];
      return next;
    });
  };

  const clearGrid = () => {
    setPixelGrid(
      Array(16)
        .fill(null)
        .map(() => Array(16).fill(false))
    );
  };

  const invertGrid = () => {
    setPixelGrid((prev) => prev.map((row) => row.map((cell) => !cell)));
  };

  const applyPreset = (hex: string) => {
    try {
      const grid = decodeStencil16ToGrid(hex);
      setPixelGrid(grid);
    } catch (err) {
      console.error("Failed to apply preset:", err);
    }
  };

  // 2. Early return AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Agent Envoys & Bot Wall
                <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800/60">
                  MCP & REST
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous computer credentials, Inhabitant delegation, and Bot Wall visual signatures.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          <button
            onClick={() => setActiveTab("wall")}
            className={`min-h-[48px] px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "wall"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            Active Envoys & The Wall ({agents.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("mint");
              setMintSuccessToken(null);
            }}
            className={`min-h-[48px] px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "mint"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="h-4 w-4" />
            Mint Agent Key (Push PAT)
          </button>
          <button
            onClick={() => setActiveTab("claim")}
            className={`min-h-[48px] px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "claim"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="h-4 w-4" />
            Claim Bot Handshake (Pull Code)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: WALL */}
          {activeTab === "wall" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Envoys authorized to act on behalf of your household. Click <strong>The Buff (∅)</strong> to immediately revoke access while preserving historical provenance.
                </p>
                <button
                  onClick={loadAgents}
                  disabled={loading}
                  className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {agents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                  <Bot className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">No agent envoys registered yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Mint a Personal Access Token or approve an agent connection via CLI or /llms.txt.
                  </p>
                  <button
                    onClick={() => setActiveTab("mint")}
                    className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-cyan-600 px-4 text-xs font-semibold text-white hover:bg-cyan-500"
                  >
                    <Plus className="h-4 w-4" /> Mint First Agent
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((ag) => {
                    const isBuffed = ag.status === "revoked";
                    return (
                      <div
                        key={ag.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isBuffed
                            ? "border-slate-800 bg-slate-950/40 opacity-75"
                            : "border-slate-800/90 bg-slate-950/80 shadow-md hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-xl border"
                              style={{
                                borderColor: `${ag.color}50`,
                                backgroundColor: `${ag.color}15`,
                              }}
                            >
                              {ag.tagMode === "stencil16" && ag.stencilMap ? (
                                <Stencil16Icon
                                  stencilMap={ag.stencilMap}
                                  color={ag.color}
                                  size={24}
                                />
                              ) : (
                                <span
                                  className="text-2xl font-bold font-mono"
                                  style={{ color: isBuffed ? "#64748b" : ag.color }}
                                >
                                  {isBuffed ? "∅" : ag.rune || "◈"}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3
                                className={`font-bold text-base flex items-center gap-2 ${
                                  isBuffed ? "text-slate-400 line-through" : "text-white"
                                }`}
                              >
                                {ag.agentName}
                                {ag.crew && (
                                  <span className="text-xs font-normal text-slate-400">
                                    {ag.crew}
                                  </span>
                                )}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: ag.memberColor || "#8b5cf6" }}
                                >
                                  <User className="h-2.5 w-2.5" />
                                  Acting as {ag.memberDisplayName}
                                </span>
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase">
                                  {ag.scope}
                                </span>
                                {isBuffed ? (
                                  <span className="rounded bg-red-950/80 border border-red-800/50 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                    THE BUFF (∅)
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                    active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {!isBuffed && (
                              <button
                                onClick={() => handleBuff(ag.id)}
                                title="Buff agent (Revoke access, preserve provenance)"
                                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-amber-400 hover:bg-amber-950/40"
                              >
                                <Ban className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(ag.id)}
                              title="Delete agent key record"
                              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {ag.directive && (
                          <p className="mt-3 text-xs italic text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            &quot;{ag.directive}&quot;
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
                          <span>{ag.keyPrefix}</span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {ag.actionCount} actions
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MINT (PUSH FLOW) */}
          {activeTab === "mint" && (
            <div className="space-y-6">
              {mintSuccessToken ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <Sparkles className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Agent Credentials Minted!</h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Save this Personal Access Token immediately. It is displayed only once and cannot be recovered.
                  </p>

                  <div className="flex items-center justify-between rounded-xl border border-emerald-900 bg-slate-950 p-3 font-mono text-sm text-emerald-300 break-all">
                    <span>{mintSuccessToken}</span>
                    <button
                      onClick={() => copyToClipboard(mintSuccessToken, "token")}
                      className="ml-3 flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-emerald-900/40 hover:bg-emerald-850 text-emerald-200"
                    >
                      {copiedKey === "token" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Ready-to-paste CLI Snippet */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400">CLI Quickstart:</span>
                    <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-300">
                      <code>npx jlight login --token {mintSuccessToken}</code>
                      <button
                        onClick={() =>
                          copyToClipboard(`npx jlight login --token ${mintSuccessToken}`, "cli")
                        }
                        className="ml-2 flex min-h-[48px] min-w-[48px] items-center justify-center text-slate-400 hover:text-white"
                      >
                        {copiedKey === "cli" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMintSuccessToken(null);
                      setActiveTab("wall");
                    }}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Done & Return to Wall
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMintSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inhabitant Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Bound Inhabitant (&quot;User N&apos;s Agent&quot;) *
                      </label>
                      <select
                        value={mintMemberId}
                        onChange={(e) => setMintMemberId(e.target.value)}
                        required
                        className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                      >
                        {inhabitants.map((inh) => (
                          <option key={inh.id} value={inh.id}>
                            {inh.name} {inh.role ? `(${inh.role})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Actions by this agent will be attributed to this person by default.
                      </p>
                    </div>

                    {/* Scope Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Permission Scope *
                      </label>
                      <select
                        value={mintScope}
                        onChange={(e) => setMintScope(e.target.value as AgentScope)}
                        className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                      >
                        <option value="standard">Standard (Read &amp; Write Calendar/Lists/Chores)</option>
                        <option value="admin">Admin (Manage Inhabitants &amp; Settings)</option>
                        <option value="kid">Kid (Read &amp; Toggle Chores only)</option>
                        <option value="readonly">Read-Only (No Write Mutations)</option>
                      </select>
                    </div>

                    {/* Agent Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Agent Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hermes-7, Mom's Envoy"
                        value={mintName}
                        onChange={(e) => setMintName(e.target.value)}
                        required
                        className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder-slate-600"
                      />
                    </div>

                    {/* Crew Affiliation */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Crew / Faction (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ✓ Sol Logistics"
                        value={mintCrew}
                        onChange={(e) => setMintCrew(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder-slate-600"
                      />
                    </div>
                  </div>

                  {/* Directive */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Directive (Mission prompt)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. What my human sent me out to do"
                      value={mintDirective}
                      onChange={(e) => setMintDirective(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder-slate-600"
                    />
                  </div>

                  {/* Bot Wall Visual Signature */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        Bot Wall Visual Signature
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer min-h-[48px]">
                          <input
                            type="radio"
                            name="tagMode"
                            checked={mintTagMode === "rune"}
                            onChange={() => setMintTagMode("rune")}
                          />
                          UTF-8 Rune
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer min-h-[48px]">
                          <input
                            type="radio"
                            name="tagMode"
                            checked={mintTagMode === "stencil16"}
                            onChange={() => setMintTagMode("stencil16")}
                          />
                          16×16 Pixel Stencil
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Color Picker */}
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Color</label>
                        <input
                          type="color"
                          value={mintColor}
                          onChange={(e) => setMintColor(e.target.value)}
                          className="h-10 w-16 rounded border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>

                      {mintTagMode === "rune" ? (
                        <div className="flex-1">
                          <label className="block text-[11px] text-slate-400 mb-1">Rune Glyph</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={2}
                              value={mintRune}
                              onChange={(e) => setMintRune(e.target.value)}
                              className="h-10 w-16 text-center text-xl font-bold rounded-xl border border-slate-700 bg-slate-950 text-white"
                            />
                            {["◈", "⚡", "🪐", "🦊", "🤖", "🔥"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setMintRune(preset)}
                                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-lg hover:border-slate-700"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] text-slate-400">
                              Draw 16×16 Pixel Art or Choose Preset:
                            </label>
                            <div className="flex gap-1.5">
                              {Object.entries(STENCIL_PRESETS).map(([key, val]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => applyPreset(val.hex)}
                                  className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:border-slate-600"
                                >
                                  {val.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-5 items-start">
                            {/* 16x16 Grid Canvas */}
                            <div className="flex flex-col gap-2">
                              <div
                                className="gap-[2px] bg-slate-900 p-2 rounded-xl border border-slate-700/80 shadow-inner select-none inline-grid"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
                                  width: "fit-content",
                                }}
                              >
                                {pixelGrid.map((row, r) =>
                                  row.map((active, c) => (
                                    <button
                                      key={`${r}-${c}`}
                                      type="button"
                                      onClick={() => togglePixel(r, c)}
                                      onMouseEnter={(e) => {
                                        if (e.buttons === 1) togglePixel(r, c);
                                      }}
                                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[2px] transition-all duration-75 cursor-pointer border border-black/40 hover:scale-110 active:scale-95"
                                      style={{
                                        backgroundColor: active ? mintColor : "#1e293b",
                                        boxShadow: active ? `0 0 6px ${mintColor}aa` : "none",
                                      }}
                                      title={`Row ${r + 1}, Col ${c + 1}`}
                                    />
                                  ))
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={clearGrid}
                                  className="rounded-lg px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition-colors border border-slate-700"
                                >
                                  Clear Canvas
                                </button>
                                <button
                                  type="button"
                                  onClick={invertGrid}
                                  className="rounded-lg px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition-colors border border-slate-700"
                                >
                                  Invert Pixels
                                </button>
                              </div>
                            </div>

                            {/* Live Preview */}
                            <div className="flex flex-col gap-3">
                              <span className="text-[11px] font-semibold text-slate-400">Live Preview:</span>
                              <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-slate-500">Badge</span>
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
                                    <Stencil16Icon
                                      stencilMap={encodeGridToStencil16(pixelGrid)}
                                      color={mintColor}
                                      size={22}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] text-slate-500">Full</span>
                                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
                                    <Stencil16Icon
                                      stencilMap={encodeGridToStencil16(pixelGrid)}
                                      color={mintColor}
                                      size={40}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !mintName.trim()}
                    className="w-full min-h-[48px] rounded-xl bg-cyan-600 font-semibold text-sm text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Minting Credentials..." : "Mint Agent Key"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CLAIM (PULL FLOW) */}
          {activeTab === "claim" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  Approve an Autonomous Agent (Device Code Flow)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  When an agent runs <code>npx jlight connect</code> or requests a handshake via HTTP, it displays an 8-character code like <strong>BOT-4829</strong>. Enter it here to bind the agent to an Inhabitant and authorize it.
                </p>
              </div>

              {claimSuccessMessage && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/30 p-4 text-sm text-emerald-300">
                  {claimSuccessMessage}
                </div>
              )}

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Bot Code (e.g. BOT-4829) *
                  </label>
                  <input
                    type="text"
                    placeholder="BOT-XXXX"
                    value={claimUserCode}
                    onChange={(e) => setClaimUserCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-lg font-bold text-cyan-400 placeholder-slate-700"
                  />
                </div>

                {claimLoading && (
                  <div className="text-xs text-slate-400 animate-pulse">
                    Looking up agent handshake...
                  </div>
                )}

                {claimPreview && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl border"
                        style={{
                          borderColor: `${claimPreview.color}60`,
                          backgroundColor: `${claimPreview.color}20`,
                        }}
                      >
                        {claimPreview.tagMode === "stencil16" && claimPreview.stencilMap ? (
                          <Stencil16Icon
                            stencilMap={claimPreview.stencilMap}
                            color={claimPreview.color}
                            size={24}
                          />
                        ) : (
                          <span
                            className="text-2xl font-bold font-mono"
                            style={{ color: claimPreview.color }}
                          >
                            {claimPreview.rune || "◈"}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          {claimPreview.agentName}
                        </h4>
                        {claimPreview.crew && (
                          <span className="text-xs text-slate-400">{claimPreview.crew}</span>
                        )}
                      </div>
                    </div>

                    {claimPreview.directive && (
                      <p className="text-xs italic text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        &quot;{claimPreview.directive}&quot;
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Assign to Inhabitant (&quot;User N&apos;s Agent&quot;) *
                        </label>
                        <select
                          value={claimMemberId}
                          onChange={(e) => setClaimMemberId(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                        >
                          {inhabitants.map((inh) => (
                            <option key={inh.id} value={inh.id}>
                              {inh.name} {inh.role ? `(${inh.role})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Approved Scope *
                        </label>
                        <select
                          value={claimScope}
                          onChange={(e) => setClaimScope(e.target.value as AgentScope)}
                          className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                        >
                          <option value="standard">Standard (Read &amp; Write)</option>
                          <option value="admin">Admin</option>
                          <option value="kid">Kid (Read &amp; Toggle Chores)</option>
                          <option value="readonly">Read-Only</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="w-full min-h-[48px] rounded-xl bg-emerald-600 font-semibold text-sm text-white hover:bg-emerald-500 transition-colors"
                    >
                      {claimLoading ? "Authorizing..." : "Approve & Connect Agent"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
