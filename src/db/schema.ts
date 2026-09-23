import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
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
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

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
  externalUid: text("external_uid"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  rrule: text("rrule"),
  colorOverride: text("color_override"),
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
    enum: ["daily", "weekly", "custom"],
  })
    .notNull()
    .default("daily"),
  daysOfWeek: text("days_of_week").default("1,2,3,4,5,6,7"),
  dueTime: text("due_time"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
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
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  galaxyId: text("galaxy_id")
    .notNull()
    .references(() => galaxies.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(), // YYYY-MM-DD
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  })
    .notNull()
    .default("dinner"),
  title: text("title").notNull(),
  notes: text("notes"),
  recipeUrl: text("recipe_url"),
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
// Backward Compatibility Aliases
// ==========================================
export const households = galaxies;
export const familyMembers = galaxyMembers;
