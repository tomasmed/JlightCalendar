import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { randomInt } from "crypto";
import type { AdapterAccountType } from "next-auth/adapters";

// ==========================================
// 1. NextAuth / Auth.js Standard Tables
// ==========================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  defaultGalaxyId: text("default_galaxy_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// ==========================================
// 2. Galaxies (Households / Group Spaces)
// ==========================================

export const galaxies = sqliteTable("galaxies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug"),
  theme: text("theme", {
    enum: ["milky-way", "andromeda", "nebula", "supernova"],
  })
    .notNull()
    .default("milky-way"),
  icon: text("icon").notNull().default("sparkles"),
  parentPin: text("parent_pin").notNull().default("1234"),
  timezone: text("timezone").notNull().default("America/New_York"),
  ownerId: text("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  joinCode: text("join_code").unique(),
  familyColor: text("family_color").notNull().default("#ef4444"),
  familyAvatar: text("family_avatar").notNull().default("planet"),
  isEphemeral: integer("is_ephemeral", { mode: "boolean" })
    .notNull()
    .default(false),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Generates a high-entropy, human-friendly 8-character galaxy join code (GLX-XXXX-XXXX).
 * 30 unambiguous alphanumeric chars ^ 8 = 656.1 billion combinations (~39.3 bits of entropy).
 * Uses CSPRNG (crypto.randomInt) to prevent PRNG state recovery and enumeration attacks.
 */
export function generateJoinCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(randomInt(0, chars.length));
  }
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(randomInt(0, chars.length));
  }
  return `GLX-${part1}-${part2}`;
}

/**
 * Generates a high-entropy, human-friendly 8-character ephemeral Comet code (CMT-XXXX-XXXX).
 */
export function generateCometCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(randomInt(0, chars.length));
  }
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(randomInt(0, chars.length));
  }
  return `CMT-${part1}-${part2}`;
}

/**
 * Generates a URL-safe human-readable slug for an ephemeral Comet or Galaxy.
 */
export function generateCometSlug(name: string): string {
  const base = (name || "comet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "comet";
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(randomInt(0, chars.length));
  }
  return `${base}-${suffix}`;
}

/**
 * Normalizes user-submitted join codes:
 * Strips whitespace, hyphens, and handles omitted "GLX-" or "CMT-" prefixes for both
 * 8-char (GLX-XXXX-XXXX / CMT-XXXX-XXXX) and legacy 5-char (GLX-XXXXX) formats.
 */
export function normalizeJoinCode(input: string): string {
  if (!input || typeof input !== "string") return "";
  const raw = input.trim().toUpperCase();
  const stripped = raw.replace(/[^A-Z0-9]/g, "");

  // 8-char with CMT prefix: "CMT8P9A2M4K" -> "CMT-8P9A-2M4K"
  if (stripped.startsWith("CMT") && stripped.length === 11) {
    return `CMT-${stripped.slice(3, 7)}-${stripped.slice(7, 11)}`;
  }
  // 5-char with CMT prefix: "CMT7SZXX" -> "CMT-7SZXX"
  if (stripped.startsWith("CMT") && stripped.length === 8) {
    return `CMT-${stripped.slice(3, 8)}`;
  }
  // 8-char without prefix: "8P9A2M4K" -> "GLX-8P9A-2M4K"
  if (stripped.length === 8 && !stripped.startsWith("GLX") && !stripped.startsWith("CMT")) {
    return `GLX-${stripped.slice(0, 4)}-${stripped.slice(4, 8)}`;
  }
  // 8-char with GLX prefix: "GLX8P9A2M4K" -> "GLX-8P9A-2M4K"
  if (stripped.startsWith("GLX") && stripped.length === 11) {
    return `GLX-${stripped.slice(3, 7)}-${stripped.slice(7, 11)}`;
  }
  // 5-char legacy with prefix: "GLX7SZXX" -> "GLX-7SZXX"
  if (stripped.startsWith("GLX") && stripped.length === 8) {
    return `GLX-${stripped.slice(3, 8)}`;
  }
  return raw;
}

// ==========================================
// 3. Galaxy Inhabitants / Members (Users, Kids, Pets)
// ==========================================

export const galaxyMembers = sqliteTable("galaxy_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  // userId is optional: unlinked kids and pets (like Java the dog) don't have Google accounts!
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  role: text("role", {
    enum: ["owner", "admin", "member", "viewer", "kid", "pet"],
  })
    .notNull()
    .default("member"),
  color: text("color").notNull().default("#8b5cf6"),
  avatarIcon: text("avatar_icon").notNull().default("user"), // 'user' | 'baby' | 'dog' | 'cat' | 'sparkles'
  starBalance: integer("star_balance").notNull().default(0),
  isKioskProfile: integer("is_kiosk_profile", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 4. Calendars (Instances per Galaxy)
// ==========================================

export const calendars = sqliteTable("calendars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b5cf6"),
  description: text("description"),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  externalProvider: text("external_provider", {
    enum: ["google", "icloud", "outlook", "ics", "local"],
  })
    .notNull()
    .default("local"),
  externalCalendarId: text("external_calendar_id"),
  syncToken: text("sync_token"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 5. Events (Assigned to Calendar & Galaxy Inhabitant)
// ==========================================

export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  calendarId: text("calendar_id").references(() => calendars.id, {
    onDelete: "cascade",
  }),
  memberId: text("member_id").references(() => galaxyMembers.id, {
    onDelete: "set null",
  }),
  memberIds: text("member_ids"), // JSON array of member IDs, e.g. ["mem_leo", "mem_mia"]
  externalUid: text("external_uid"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  rrule: text("rrule"),
  exdates: text("exdates"), // JSON array or comma-separated list of YYYY-MM-DD excluded dates
  colorOverride: text("color_override"),
  createdByAgentId: text("created_by_agent_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 6. Chores & Gamification (Kid Mode & Star Store)
// ==========================================

export const chores = sqliteTable("chores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => galaxyMembers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  points: integer("points").notNull().default(1),
  recurrenceType: text("recurrence_type", {
    enum: ["daily", "weekly", "biweekly", "custom", "one_time"],
  })
    .notNull()
    .default("daily"),
  daysOfWeek: text("days_of_week").default("1,2,3,4,5,6,7"),
  dueTime: text("due_time"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdByAgentId: text("created_by_agent_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const choreCompletions = sqliteTable("chore_completions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  choreId: text("chore_id")
    .notNull()
    .references(() => chores.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => galaxyMembers.id, { onDelete: "cascade" }),
  completedDate: text("completed_date").notNull(), // YYYY-MM-DD
  pointsAwarded: integer("points_awarded").notNull().default(1),
  createdByAgentId: text("created_by_agent_id"),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 7. Shared Lists & Meal Plans
// ==========================================

export const listItems = sqliteTable("list_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  listType: text("list_type", { enum: ["grocery", "todo", "packing"] })
    .notNull()
    .default("grocery"),
  title: text("title").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  addedByMemberId: text("added_by_member_id").references(
    () => galaxyMembers.id,
    { onDelete: "set null" }
  ),
  createdByAgentId: text("created_by_agent_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => galaxyMembers.id, {
    onDelete: "set null",
  }),
  planDate: text("plan_date").notNull(), // YYYY-MM-DD
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  })
    .notNull()
    .default("dinner"),
  title: text("title").notNull(),
  notes: text("notes"),
  recipeUrl: text("recipe_url"),
  createdByAgentId: text("created_by_agent_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 8. Wall Kiosk Display Devices
// ==========================================

export const displayDevices = sqliteTable("display_devices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id").references(() => galaxies.id, {
    onDelete: "cascade",
  }),
  deviceName: text("device_name").notNull().default("Wall Tablet"),
  pairingCode: text("pairing_code"),
  isPaired: integer("is_paired", { mode: "boolean" }).notNull().default(false),
  currentMode: text("current_mode", { enum: ["admin", "standard", "kid"] })
    .notNull()
    .default("standard"),
  nightSleepEnabled: integer("night_sleep_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  sleepStart: text("sleep_start").notNull().default("23:00"),
  sleepEnd: text("sleep_end").notNull().default("06:00"),
  lastActiveAt: text("last_active_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 9. Autonomous Agents & Bot Wall
// ==========================================

export const agentKeys = sqliteTable("agent_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => galaxyMembers.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  tokenHash: text("token_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  agentName: text("agent_name").notNull(),
  crew: text("crew"),
  directive: text("directive"),
  tagMode: text("tag_mode", { enum: ["rune", "stencil16"] })
    .notNull()
    .default("rune"),
  rune: text("rune").notNull().default("◈"),
  color: text("color").notNull().default("#06b6d4"),
  stencilMap: text("stencil_map"),
  scope: text("scope", { enum: ["admin", "standard", "kid", "readonly"] })
    .notNull()
    .default("standard"),
  status: text("status", { enum: ["active", "revoked"] })
    .notNull()
    .default("active"),
  actionCount: integer("action_count").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const agentDeviceCodes = sqliteTable("agent_device_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceCodeHash: text("device_code_hash").notNull().unique(),
  userCode: text("user_code").notNull().unique(),
  agentName: text("agent_name").notNull(),
  crew: text("crew"),
  directive: text("directive"),
  tagMode: text("tag_mode", { enum: ["rune", "stencil16"] })
    .notNull()
    .default("rune"),
  rune: text("rune").notNull().default("◈"),
  color: text("color").notNull().default("#06b6d4"),
  stencilMap: text("stencil_map"),
  requestedScope: text("requested_scope", {
    enum: ["admin", "standard", "kid", "readonly"],
  })
    .notNull()
    .default("standard"),
  status: text("status", { enum: ["pending", "approved", "denied", "expired"] })
    .notNull()
    .default("pending"),
  galaxyId: text("galaxy_id").references(() => galaxies.id, {
    onDelete: "cascade",
  }),
  memberId: text("member_id").references(() => galaxyMembers.id, {
    onDelete: "cascade",
  }),
  mintedRawToken: text("minted_raw_token"),
  agentKeyId: text("agent_key_id").references(() => agentKeys.id, {
    onDelete: "set null",
  }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// Backward Compatibility Aliases
// ==========================================
export const households = galaxies;
export const familyMembers = galaxyMembers;
export const calendarConnections = calendars;
