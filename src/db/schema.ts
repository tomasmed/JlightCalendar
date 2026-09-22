import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentPin: text("parent_pin").notNull().default("1234"),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const familyMembers = sqliteTable("family_members", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  avatarIcon: text("avatar_icon").notNull().default("user"),
  role: text("role", { enum: ["parent", "child", "guest"] })
    .notNull()
    .default("child"),
  starBalance: integer("star_balance").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const displayDevices = sqliteTable("display_devices", {
  id: text("id").primaryKey(),
  householdId: text("household_id").references(() => households.id, {
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

export const calendarConnections = sqliteTable("calendar_connections", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  provider: text("provider", {
    enum: ["google", "icloud", "outlook", "ics", "local"],
  }).notNull(),
  accountEmail: text("account_email"),
  syncToken: text("sync_token"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  calendarId: text("calendar_id").references(() => calendarConnections.id),
  memberId: text("member_id").references(() => familyMembers.id, {
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

export const chores = sqliteTable("chores", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  points: integer("points").notNull().default(1),
  recurrenceType: text("recurrence_type", {
    enum: ["daily", "weekly", "custom"],
  })
    .notNull()
    .default("daily"),
  daysOfWeek: text("days_of_week").default("1,2,3,4,5,6,7"), // CSV of day numbers (1=Mon)
  dueTime: text("due_time"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const choreCompletions = sqliteTable("chore_completions", {
  id: text("id").primaryKey(),
  choreId: text("chore_id")
    .notNull()
    .references(() => chores.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => familyMembers.id, { onDelete: "cascade" }),
  completedDate: text("completed_date").notNull(), // YYYY-MM-DD
  pointsAwarded: integer("points_awarded").notNull().default(1),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const listItems = sqliteTable("list_items", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  listType: text("list_type", { enum: ["grocery", "todo", "packing"] })
    .notNull()
    .default("grocery"),
  title: text("title").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  addedByMemberId: text("added_by_member_id").references(
    () => familyMembers.id,
    { onDelete: "set null" }
  ),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
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
