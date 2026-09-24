import { db } from "./index";
import {
  users,
  galaxies,
  galaxyMembers,
  calendars,
  events,
  displayDevices,
  chores,
  listItems,
  mealPlans,
} from "./schema";

async function main() {
  console.log("🌱 Seeding database with Galaxies, Inhabitants, Calendars & Events...");

  // 1. Primary Demo User
  const demoUserId = "usr_demo_parent";
  await db
    .insert(users)
    .values({
      id: demoUserId,
      name: "Demo Parent",
      email: "demo@jlightcalendar.internal",
      defaultGalaxyId: "galaxy_sol_family",
    })
    .onConflictDoNothing();

  // 2. Galaxies
  const solGalaxyId = "galaxy_sol_family";
  const grandparentsGalaxyId = "galaxy_grandparents";
  const kidsGalaxyId = "galaxy_kids_orbit";

  await db
    .insert(galaxies)
    .values([
      {
        id: solGalaxyId,
        name: "The Sol Family Galaxy",
        slug: "sol-family",
        theme: "milky-way",
        icon: "sparkles",
        parentPin: "1234",
        timezone: "America/New_York",
        ownerId: demoUserId,
      },
      {
        id: grandparentsGalaxyId,
        name: "Grandparents & Co.",
        slug: "grandparents",
        theme: "andromeda",
        icon: "heart",
        parentPin: "1234",
        timezone: "America/New_York",
        ownerId: demoUserId,
      },
      {
        id: kidsGalaxyId,
        name: "Kids Adventure Orbit",
        slug: "kids-orbit",
        theme: "supernova",
        icon: "rocket",
        parentPin: "1234",
        timezone: "America/New_York",
        ownerId: demoUserId,
      },
    ])
    .onConflictDoNothing();

  // 3. Inhabitants / Members
  // Family Galaxy Inhabitants: Mom, Dad, Leo, Mia, and Java (the Dog!)
  await db
    .insert(galaxyMembers)
    .values([
      {
        id: "mem_mom",
        galaxyId: solGalaxyId,
        userId: demoUserId,
        displayName: "Mom",
        role: "admin",
        color: "#ec4899",
        avatarIcon: "user",
        starBalance: 0,
      },
      {
        id: "mem_dad",
        galaxyId: solGalaxyId,
        displayName: "Dad",
        role: "admin",
        color: "#10b981",
        avatarIcon: "user",
        starBalance: 0,
      },
      {
        id: "mem_leo",
        galaxyId: solGalaxyId,
        displayName: "Leo",
        role: "kid",
        color: "#8b5cf6",
        avatarIcon: "baby",
        starBalance: 18,
      },
      {
        id: "mem_mia",
        galaxyId: solGalaxyId,
        displayName: "Mia",
        role: "kid",
        color: "#f59e0b",
        avatarIcon: "baby",
        starBalance: 24,
      },
      {
        id: "mem_java",
        galaxyId: solGalaxyId,
        displayName: "Java 🐕",
        role: "pet",
        color: "#06b6d4",
        avatarIcon: "dog",
        starBalance: 0,
      },
      // Grandparents Galaxy Inhabitants
      {
        id: "mem_grandma",
        galaxyId: grandparentsGalaxyId,
        displayName: "Grandma Sue",
        role: "admin",
        color: "#ec4899",
        avatarIcon: "user",
        starBalance: 0,
      },
      {
        id: "mem_grandpa",
        galaxyId: grandparentsGalaxyId,
        displayName: "Grandpa Joe",
        role: "admin",
        color: "#3b82f6",
        avatarIcon: "user",
        starBalance: 0,
      },
      {
        id: "mem_gp_mom",
        galaxyId: grandparentsGalaxyId,
        userId: demoUserId,
        displayName: "Mom",
        role: "member",
        color: "#a855f7",
        avatarIcon: "user",
        starBalance: 0,
      },
    ])
    .onConflictDoNothing();

  // 4. Calendars
  const calPrimarySol = "cal_sol_primary";
  const calVetSol = "cal_sol_pet";
  const calGpPrimary = "cal_gp_primary";

  await db
    .insert(calendars)
    .values([
      {
        id: calPrimarySol,
        galaxyId: solGalaxyId,
        name: "Primary Family Orbit",
        color: "#8b5cf6",
        isPrimary: true,
        description: "Main household calendar for all family events",
      },
      {
        id: calVetSol,
        galaxyId: solGalaxyId,
        name: "Java's Pet Care & Vet",
        color: "#06b6d4",
        isPrimary: false,
        description: "Vet checkups, medication, grooming for Java",
      },
      {
        id: calGpPrimary,
        galaxyId: grandparentsGalaxyId,
        name: "Grandparents Family Circle",
        color: "#3b82f6",
        isPrimary: true,
        description: "Shared gatherings, Sunday roasts, doctor visits",
      },
    ])
    .onConflictDoNothing();

  // 5. Events
  await db
    .insert(events)
    .values([
      {
        id: "evt_java_vet",
        galaxyId: solGalaxyId,
        calendarId: calVetSol,
        memberId: "mem_java",
        title: "Java Annual Vet Checkup & Vaccines 🐾",
        description: "Bring vaccination passport to Healthy Paws Veterinary",
        location: "Healthy Paws Clinic, Suite 4",
        startTime: "2026-09-24T14:30:00",
        endTime: "2026-09-24T15:30:00",
        isAllDay: false,
        colorOverride: "#06b6d4",
      },
      {
        id: "evt_leo_soccer",
        galaxyId: solGalaxyId,
        calendarId: calPrimarySol,
        memberId: "mem_leo",
        title: "Leo Soccer Practice ⚽",
        description: "Bring cleats, shin guards, and water bottle",
        location: "Community Field 2",
        startTime: "2026-09-21T16:30:00",
        endTime: "2026-09-21T17:30:00",
        isAllDay: false,
        colorOverride: "#8b5cf6",
      },
      {
        id: "evt_family_taco",
        galaxyId: solGalaxyId,
        calendarId: calPrimarySol,
        memberId: null,
        title: "Family Taco Night 🌮",
        description: "Homemade beef tacos and guacamole with the whole crew",
        location: "Home Kitchen",
        startTime: "2026-09-21T18:30:00",
        endTime: "2026-09-21T19:30:00",
        isAllDay: false,
        colorOverride: "#ffd166",
      },
      {
        id: "evt_mia_gym",
        galaxyId: solGalaxyId,
        calendarId: calPrimarySol,
        memberId: "mem_mia",
        title: "Mia Gymnastics 🤸‍♀️",
        location: "YMCA Gym A",
        startTime: "2026-09-22T17:15:00",
        endTime: "2026-09-22T18:00:00",
        isAllDay: false,
        colorOverride: "#f59e0b",
      },
      {
        id: "evt_gp_dinner",
        galaxyId: grandparentsGalaxyId,
        calendarId: calGpPrimary,
        memberId: "mem_grandma",
        title: "Sunday Family Roast at Grandma's 🍗",
        description: "Bring dessert! Kids love Grandma's mashed potatoes",
        location: "Grandma & Grandpa's House",
        startTime: "2026-09-27T17:00:00",
        endTime: "2026-09-27T19:30:00",
        isAllDay: false,
        colorOverride: "#ec4899",
      },
      {
        id: "evt_gp_garden",
        galaxyId: grandparentsGalaxyId,
        calendarId: calGpPrimary,
        memberId: "mem_grandpa",
        title: "Tomato Harvesting with Grandpa 🍅",
        location: "Backyard Garden",
        startTime: "2026-09-26T10:00:00",
        endTime: "2026-09-26T12:00:00",
        isAllDay: false,
        colorOverride: "#3b82f6",
      },
    ])
    .onConflictDoNothing();

  // 6. Wall Display Device
  await db
    .insert(displayDevices)
    .values({
      id: "dev_wall_kitchen",
      galaxyId: solGalaxyId,
      deviceName: "Kitchen Wall Display",
      currentMode: "standard",
      nightSleepEnabled: true,
      sleepStart: "23:00",
      sleepEnd: "06:00",
    })
    .onConflictDoNothing();

  // 7. Chores
  await db
    .insert(chores)
    .values([
      {
        id: "chore_1",
        galaxyId: solGalaxyId,
        memberId: "mem_leo",
        title: "Walk Java the Dog 🐕",
        points: 2,
        recurrenceType: "daily",
        dueTime: "17:00",
      },
      {
        id: "chore_2",
        galaxyId: solGalaxyId,
        memberId: "mem_mia",
        title: "Feed Java & Refill Water Bowl",
        points: 1,
        recurrenceType: "daily",
        dueTime: "08:00",
      },
    ])
    .onConflictDoNothing();

  // 8. Grocery Items
  await db
    .insert(listItems)
    .values([
      {
        id: "list_1",
        galaxyId: solGalaxyId,
        listType: "grocery",
        title: "Java's Dog Food (Salmon & Sweet Potato)",
        isCompleted: false,
        addedByMemberId: "mem_mom",
      },
      {
        id: "list_2",
        galaxyId: solGalaxyId,
        listType: "grocery",
        title: "Avocados for Taco Night",
        isCompleted: true,
        addedByMemberId: "mem_mom",
      },
      {
        id: "list_3",
        galaxyId: solGalaxyId,
        listType: "grocery",
        title: "Ground Turkey (2 lbs)",
        isCompleted: false,
        addedByMemberId: "mem_dad",
      },
      {
        id: "list_4",
        galaxyId: solGalaxyId,
        listType: "grocery",
        title: "Cheddar Cheese Block",
        isCompleted: false,
        addedByMemberId: "mem_leo",
      },
      {
        id: "list_5",
        galaxyId: solGalaxyId,
        listType: "grocery",
        title: "Bananas & Blueberries",
        isCompleted: true,
        addedByMemberId: "mem_mia",
      },
    ])
    .onConflictDoNothing();

  // 9. Initial Meal Plans
  await db
    .insert(mealPlans)
    .values([
      {
        id: "meal_mon",
        galaxyId: solGalaxyId,
        memberId: "mem_mom",
        planDate: "2026-09-21",
        mealType: "dinner",
        title: "Homemade Beef Tacos & Guacamole",
      },
      {
        id: "meal_tue",
        galaxyId: solGalaxyId,
        memberId: "mem_dad",
        planDate: "2026-09-22",
        mealType: "dinner",
        title: "Grilled Salmon & Asparagus",
      },
      {
        id: "meal_wed",
        galaxyId: solGalaxyId,
        memberId: "mem_mom",
        planDate: "2026-09-23",
        mealType: "dinner",
        title: "Spaghetti Bolognese with Garlic Bread",
      },
      {
        id: "meal_thu",
        galaxyId: solGalaxyId,
        memberId: "mem_dad",
        planDate: "2026-09-24",
        mealType: "dinner",
        title: "Slow-Cooker Pulled Pork Sandwiches",
      },
      {
        id: "meal_fri",
        galaxyId: solGalaxyId,
        memberId: "mem_leo",
        planDate: "2026-09-25",
        mealType: "dinner",
        title: "Family Pizza Night (Build Your Own)",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Database seeded with Galaxies, Inhabitants, Calendars, Events, Chores & Meals!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
