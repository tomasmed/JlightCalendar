import { db } from "./index";
import {
  households,
  familyMembers,
  displayDevices,
  chores,
  listItems,
  mealPlans,
} from "./schema";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Default Household
  const householdId = "household_default";
  await db
    .insert(households)
    .values({
      id: householdId,
      name: "The Family",
      parentPin: "1234",
      timezone: "America/New_York",
    })
    .onConflictDoNothing();

  // 2. Create Family Members
  await db
    .insert(familyMembers)
    .values([
      {
        id: "mem_mom",
        householdId,
        name: "Mom",
        color: "#ec4899",
        avatarIcon: "user",
        role: "parent",
        starBalance: 0,
      },
      {
        id: "mem_dad",
        householdId,
        name: "Dad",
        color: "#10b981",
        avatarIcon: "user",
        role: "parent",
        starBalance: 0,
      },
      {
        id: "mem_leo",
        householdId,
        name: "Leo",
        color: "#8b5cf6",
        avatarIcon: "baby",
        role: "child",
        starBalance: 18,
      },
      {
        id: "mem_mia",
        householdId,
        name: "Mia",
        color: "#f59e0b",
        avatarIcon: "baby",
        role: "child",
        starBalance: 24,
      },
    ])
    .onConflictDoNothing();

  // 3. Create Default Wall Display Device
  await db
    .insert(displayDevices)
    .values({
      id: "dev_wall_kitchen",
      householdId,
      deviceName: "Kitchen Wall Tablet",
      currentMode: "standard",
      nightSleepEnabled: true,
      sleepStart: "23:00",
      sleepEnd: "06:00",
    })
    .onConflictDoNothing();

  // 4. Create Initial Chores
  await db
    .insert(chores)
    .values([
      {
        id: "chore_1",
        householdId,
        memberId: "mem_leo",
        title: "Make Bed & Tidy Room",
        points: 2,
        recurrenceType: "daily",
      },
      {
        id: "chore_2",
        householdId,
        memberId: "mem_leo",
        title: "Feed the Dog",
        points: 1,
        recurrenceType: "daily",
        dueTime: "17:00",
      },
      {
        id: "chore_3",
        householdId,
        memberId: "mem_leo",
        title: "Take Out Recycling Bin",
        points: 3,
        recurrenceType: "weekly",
      },
      {
        id: "chore_4",
        householdId,
        memberId: "mem_mia",
        title: "Put Away Backpack & Shoes",
        points: 1,
        recurrenceType: "daily",
      },
      {
        id: "chore_5",
        householdId,
        memberId: "mem_mia",
        title: "Brush Teeth (2 mins)",
        points: 1,
        recurrenceType: "daily",
      },
    ])
    .onConflictDoNothing();

  // 5. Create Initial Grocery Items
  await db
    .insert(listItems)
    .values([
      {
        id: "list_1",
        householdId,
        listType: "grocery",
        title: "Whole Milk (1 Gallon)",
        isCompleted: false,
      },
      {
        id: "list_2",
        householdId,
        listType: "grocery",
        title: "Avocados (4-pack)",
        isCompleted: false,
      },
      {
        id: "list_3",
        householdId,
        listType: "grocery",
        title: "Corn Tortillas",
        isCompleted: true,
      },
      {
        id: "list_4",
        householdId,
        listType: "grocery",
        title: "Ground Turkey (2 lbs)",
        isCompleted: false,
      },
    ])
    .onConflictDoNothing();

  // 6. Create Initial Meal Plans
  await db
    .insert(mealPlans)
    .values([
      {
        id: "meal_mon",
        householdId,
        planDate: "2026-09-21",
        mealType: "dinner",
        title: "Homemade Beef Tacos & Guacamole",
      },
      {
        id: "meal_tue",
        householdId,
        planDate: "2026-09-22",
        mealType: "dinner",
        title: "Grilled Salmon & Asparagus",
      },
      {
        id: "meal_wed",
        householdId,
        planDate: "2026-09-23",
        mealType: "dinner",
        title: "Spaghetti Bolognese with Garlic Bread",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed completed successfully!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
