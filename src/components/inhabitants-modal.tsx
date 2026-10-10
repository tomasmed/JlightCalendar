"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Sparkles,
  User,
  Baby,
  Dog,
  Cat,
  Shield,
  Trash2,
  AlertTriangle,
  Loader2,
  Lock,
  Pencil,
  Check,
  Globe2,
  Flame,
  Sun,
  Moon,
  Rocket,
  Palette,
} from "lucide-react";
import { AccessMode } from "./kiosk-header";

export interface CosmicAvatarOption {
  id: "planet" | "comet" | "constellation" | "sun" | "moon" | "shooting-star";
  label: string;
  icon: React.ElementType;
}

export const COSMIC_FAMILY_AVATARS: CosmicAvatarOption[] = [
  { id: "planet", label: "Planet", icon: Globe2 },
  { id: "comet", label: "Comet", icon: Flame },
  { id: "constellation", label: "Constellation", icon: Sparkles },
  { id: "sun", label: "Sun", icon: Sun },
  { id: "moon", label: "Crescent Moon", icon: Moon },
  { id: "shooting-star", label: "Shooting Star", icon: Rocket },
];

export function getCosmicAvatarIcon(id?: string | null): React.ElementType {
  const match = COSMIC_FAMILY_AVATARS.find((a) => a.id === id);
  return match ? match.icon : Globe2;
}

export interface Inhabitant {
  id: string;
  galaxyId: string;
  displayName: string;
  role: "owner" | "admin" | "member" | "viewer" | "kid" | "pet";
  color: string;
  avatarIcon: string;
  starBalance: number;
}

interface InhabitantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  galaxyName: string;
  inhabitants: Inhabitant[];
  accessMode?: AccessMode;
  familyColor?: string;
  familyAvatar?: string;
  onUpdateFamilyIdentity?: (data: { familyColor: string; familyAvatar: string }) => Promise<void>;
  onAddInhabitant: (newInhabitant: {
    displayName: string;
    role: "admin" | "member" | "kid" | "pet";
    color: string;
    avatarIcon: string;
  }) => Promise<void>;
  onUpdateInhabitant?: (updatedMember: {
    id: string;
    displayName?: string;
    role?: "admin" | "member" | "kid" | "pet";
    color?: string;
    avatarIcon?: string;
  }) => Promise<void>;
  onRemoveInhabitant?: (memberId: string) => Promise<void>;
}

const COLOR_PRESETS = [
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ffd166", // Yellow / Gold
  "#ef4444", // Red
  "#6366f1", // Indigo
];

export function InhabitantsModal({
  isOpen,
  onClose,
  galaxyName,
  inhabitants,
  accessMode = "standard",
  familyColor = "#ef4444",
  familyAvatar = "planet",
  onUpdateFamilyIdentity,
  onAddInhabitant,
  onUpdateInhabitant,
  onRemoveInhabitant,
}: InhabitantsModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "kid" | "pet">("member");
  const [avatar, setAvatar] = useState("user");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Family Identity State (Admin manageable)
  const [currentFamilyColor, setCurrentFamilyColor] = useState(familyColor);
  const [currentFamilyAvatar, setCurrentFamilyAvatar] = useState(familyAvatar);
  const [isSavingFamilyIdentity, setIsSavingFamilyIdentity] = useState(false);
  const [familyIdentitySaved, setFamilyIdentitySaved] = useState(false);

  // Update family identity local state when props change
  React.useEffect(() => {
    setCurrentFamilyColor(familyColor);
    setCurrentFamilyAvatar(familyAvatar);
  }, [familyColor, familyAvatar]);

  const handleSaveFamilyIdentity = async () => {
    if (!onUpdateFamilyIdentity || isSavingFamilyIdentity) return;
    setIsSavingFamilyIdentity(true);
    try {
      await onUpdateFamilyIdentity({
        familyColor: currentFamilyColor,
        familyAvatar: currentFamilyAvatar,
      });
      setFamilyIdentitySaved(true);
      setTimeout(() => setFamilyIdentitySaved(false), 2500);
    } finally {
      setIsSavingFamilyIdentity(false);
    }
  };

  // Edit member modal state
  const [editingMember, setEditingMember] = useState<Inhabitant | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "member" | "kid" | "pet">("member");
  const [editAvatar, setEditAvatar] = useState("user");
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Confirmation modal state for member removal
  const [memberToRemove, setMemberToRemove] = useState<Inhabitant | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddInhabitant({
        displayName: name.trim(),
        role,
        color: selectedColor,
        avatarIcon: avatar,
      });
      setName("");
      setRole("member");
      setAvatar("user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (inhabitant: Inhabitant) => {
    setEditingMember(inhabitant);
    setEditName(inhabitant.displayName);
    setEditRole(
      (["admin", "member", "kid", "pet"] as const).includes(
        inhabitant.role as "admin" | "member" | "kid" | "pet"
      )
        ? (inhabitant.role as "admin" | "member" | "kid" | "pet")
        : "member"
    );
    setEditAvatar(inhabitant.avatarIcon || "user");
    setEditColor(inhabitant.color || COLOR_PRESETS[1]);
    setUpdateError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !onUpdateInhabitant || !editName.trim()) return;

    setIsUpdating(true);
    setUpdateError(null);
    try {
      await onUpdateInhabitant({
        id: editingMember.id,
        displayName: editName.trim(),
        role: editingMember.role === "owner" ? undefined : editRole,
        color: editColor,
        avatarIcon: editAvatar,
      });
      setEditingMember(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update inhabitant.";
      setUpdateError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !onRemoveInhabitant) return;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      await onRemoveInhabitant(memberToRemove.id);
      setMemberToRemove(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove inhabitant.";
      setRemoveError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "dog":
        return Dog;
      case "cat":
        return Cat;
      case "baby":
        return Baby;
      case "sparkles":
        return Sparkles;
      default:
        return User;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmos-void/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-cosmos-card border border-cosmos-borderLight rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cosmos-border flex items-center justify-between bg-cosmos-deep/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-starlight">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Galaxy Inhabitants
              </h2>
              <p className="text-xs text-slate-400">
                People, kids, and pets in <span className="text-starlight font-bold">{galaxyName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-cosmos-surface hover:bg-cosmos-cardHover text-slate-400 hover:text-white border border-cosmos-border transition min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Family Identity (Admin Mode Only) */}
          {accessMode === "admin" && (
            <div className="p-4 rounded-2xl bg-cosmos-deep/80 border border-cosmos-borderLight/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: currentFamilyColor }}
                  >
                    {React.createElement(getCosmicAvatarIcon(currentFamilyAvatar), {
                      className: "w-4 h-4",
                    })}
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-white block">
                      Whole-Family Identity
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Applied to family-wide events and shared schedules
                    </span>
                  </div>
                </div>

                {onUpdateFamilyIdentity && (
                  <button
                    type="button"
                    onClick={handleSaveFamilyIdentity}
                    disabled={isSavingFamilyIdentity}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    {isSavingFamilyIdentity ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : familyIdentitySaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Identity</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Cosmic Avatar Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Cosmic Family Icon (Galaxy Emblem)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COSMIC_FAMILY_AVATARS.map((cosmic) => {
                    const CosmicIcon = cosmic.icon;
                    const isSelected = currentFamilyAvatar === cosmic.id;
                    return (
                      <button
                        key={cosmic.id}
                        type="button"
                        onClick={() => setCurrentFamilyAvatar(cosmic.id)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition min-h-[48px] ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-400 text-white ring-2 ring-starlight/50 shadow-md"
                            : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white hover:bg-cosmos-cardHover"
                        }`}
                      >
                        <CosmicIcon className="w-4 h-4 text-starlight" />
                        <span className="text-[9px] font-bold truncate max-w-full">
                          {cosmic.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Family Color Preset Selector (Default Red #ef4444) */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Family Color (Default: Red)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCurrentFamilyColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-8 h-8 rounded-xl border-2 transition min-w-[32px] min-h-[32px] ${
                        currentFamilyColor.toLowerCase() === color.toLowerCase()
                          ? "border-white scale-110 shadow-lg ring-2 ring-starlight"
                          : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Current Inhabitants List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Active Crew & Companions ({inhabitants.length})
              </span>
              {accessMode !== "admin" && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Admin mode required to remove members</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inhabitants.map((inhabitant) => {
                const Icon = getIcon(inhabitant.avatarIcon);
                const isOwner = inhabitant.role === "owner";
                const canRemove =
                  accessMode === "admin" && !isOwner && !!onRemoveInhabitant;

                return (
                  <div
                    key={inhabitant.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-cosmos-surface/80 border border-cosmos-border hover:border-cosmos-borderLight transition justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                        style={{ backgroundColor: inhabitant.color }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {inhabitant.displayName}
                          </span>
                          {inhabitant.role === "owner" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/30 text-starlight border border-purple-400/40">
                              Owner
                            </span>
                          )}
                          {inhabitant.role === "pet" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Pet
                            </span>
                          )}
                          {inhabitant.role === "kid" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kid
                            </span>
                          )}
                          {inhabitant.role === "admin" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 capitalize">
                          {inhabitant.role}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit & Remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {accessMode === "admin" && !!onUpdateInhabitant && (
                        <button
                          type="button"
                          onClick={() => startEditing(inhabitant)}
                          title={`Edit ${inhabitant.displayName}'s color or avatar`}
                          className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove Action Button (Strictly Admin Mode & Non-Owner) */}
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveError(null);
                            setMemberToRemove(inhabitant);
                          }}
                          title={`Remove ${inhabitant.displayName} from galaxy`}
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-200 border border-rose-500/30 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Inhabitant Form (Suppressed in Kid Mode) */}
          {accessMode !== "kid" && (
            <form
              onSubmit={handleAdd}
              className="p-5 rounded-2xl bg-cosmos-deep/80 border border-cosmos-borderLight space-y-4"
            >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-starlight flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Inhabitant / Companion (e.g. Java the Dog)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Java, Grandma Sue, Baby Leo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Role in Galaxy
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "member" | "kid" | "pet")
                  }
                  className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
                >
                  <option value="member">Family Member (Standard)</option>
                  <option value="admin">Admin / Parent</option>
                  <option value="kid">Child / Kid Profile</option>
                  <option value="pet">Pet / Companion (Java, etc.)</option>
                </select>
              </div>
            </div>

            {/* Avatar & Color Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Avatar Icon
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: "user", icon: User, label: "Person" },
                    { id: "baby", icon: Baby, label: "Child" },
                    { id: "dog", icon: Dog, label: "Dog" },
                    { id: "cat", icon: Cat, label: "Cat" },
                    { id: "sparkles", icon: Sparkles, label: "Star" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setAvatar(item.id)}
                        className={`p-3 rounded-xl border flex items-center justify-center min-w-[48px] min-h-[48px] transition ${
                          avatar === item.id
                            ? "bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-500/20"
                            : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-9 h-9 rounded-xl border-2 transition min-w-[36px] min-h-[36px] ${
                        selectedColor === color
                          ? "border-white scale-110 shadow-lg"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-500/30 transition disabled:opacity-50 min-h-[48px] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Adding..." : "Add to Galaxy"}</span>
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Member Removal Confirmation Modal */}
        {memberToRemove && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-cosmos-void/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-cosmos-card border border-rose-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  Remove {memberToRemove.displayName}?
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <strong className="text-white">
                    {memberToRemove.displayName}
                  </strong>{" "}
                  from <strong className="text-starlight">{galaxyName}</strong>?
                </p>
                {memberToRemove.role === "kid" && (
                  <p className="text-[11px] text-amber-300/90 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                    ⚠️ Removing this kid profile will delete their assigned
                    chores and star balances.
                  </p>
                )}
              </div>

              {removeError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                  {removeError}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={() => {
                    setMemberToRemove(null);
                    setRemoveError(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-slate-300 font-bold text-xs transition min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={handleConfirmRemove}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs tracking-wide shadow-lg shadow-rose-600/30 transition min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Member</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Member Edit Modal */}
        {editingMember && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-cosmos-void/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-cosmos-card border border-purple-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-cosmos-border pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                    style={{ backgroundColor: editColor }}
                  >
                    {(() => {
                      const Icon = getIcon(editAvatar);
                      return <Icon className="w-5 h-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Edit Inhabitant Profile
                    </h3>
                    <p className="text-xs text-slate-400">
                      Customize avatar color, icon, name, and role
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingMember(null)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-cosmos-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Name / Identifier
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 min-h-[48px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Role in Galaxy
                    </label>
                    <select
                      disabled={editingMember.role === "owner"}
                      value={editRole}
                      onChange={(e) =>
                        setEditRole(e.target.value as "admin" | "member" | "kid" | "pet")
                      }
                      className="w-full px-4 py-3 rounded-xl bg-cosmos-surface border border-cosmos-border text-white text-sm font-medium focus:outline-none focus:border-purple-500 disabled:opacity-60 min-h-[48px]"
                    >
                      {editingMember.role === "owner" ? (
                        <option value="owner">Galaxy Owner (Primary)</option>
                      ) : (
                        <>
                          <option value="member">Family Member (Standard)</option>
                          <option value="admin">Admin / Parent</option>
                          <option value="kid">Child / Kid Profile</option>
                          <option value="pet">Pet / Companion</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Avatar Icon Selection */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Avatar Icon
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "user", icon: User, label: "Person" },
                      { id: "baby", icon: Baby, label: "Child" },
                      { id: "dog", icon: Dog, label: "Dog" },
                      { id: "cat", icon: Cat, label: "Cat" },
                      { id: "sparkles", icon: Sparkles, label: "Star" },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = editAvatar === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setEditAvatar(item.id)}
                          className={`p-3 rounded-xl border flex items-center justify-center min-w-[48px] min-h-[48px] transition ${
                            isSelected
                              ? "bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-500/20"
                              : "bg-cosmos-surface border-cosmos-border text-slate-400 hover:text-white"
                          }`}
                          title={item.label}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Selection (Including Yellow) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Avatar & Orbital Badge Color
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setEditColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-10 h-10 rounded-xl border-2 transition min-w-[40px] min-h-[40px] ${
                          editColor.toLowerCase() === color.toLowerCase()
                            ? "border-white scale-110 shadow-lg ring-2 ring-starlight"
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {updateError && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                    {updateError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-cosmos-border">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => setEditingMember(null)}
                    className="py-3 px-5 rounded-xl bg-cosmos-surface hover:bg-cosmos-cardHover border border-cosmos-border text-slate-300 font-bold text-xs transition min-h-[48px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !editName.trim()}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs tracking-wide shadow-lg shadow-purple-600/30 transition min-h-[48px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
