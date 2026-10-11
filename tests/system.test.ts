import fs from "fs";
import path from "path";

const TEST_DB_FILE = path.resolve(process.cwd(), ".tmp-system-test.db");

function cleanupDbFiles() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const target = `${TEST_DB_FILE}${suffix}`;
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // Ignore locked file during cleanup if Windows handle is closing
      }
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ SYSTEM TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ Passed: ${message}`);
  }
}

async function runSystemTests() {
  // 1. Configure isolated test environment BEFORE importing DB/route modules
  process.env.JLIGHT_TEST_MODE = "true";
  process.env.DATABASE_URL = `file:${TEST_DB_FILE}`;
  delete process.env.DATABASE_AUTH_TOKEN;

  cleanupDbFiles();

  console.log("====================================================");
  console.log("🚀 1. Standing up Isolated Mocked SQLite DB Env");
  console.log("====================================================");

  const { db, client } = await import("../src/db");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { ensureDatabaseSchema } = await import("../src/db/ensure-schema");
  const { setMockTestSession } = await import("../src/auth");
  const { ensureDbUser } = await import("../src/lib/auth-helpers");
  const { expandRecurringEvents } = await import("../src/lib/recurrence");

  // Apply Drizzle migrations & runtime schema auto-healing
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  await ensureDatabaseSchema();

  const tablesCheck = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const tableNames = tablesCheck.rows.map((r) => String(r.name));
  assert(
    tableNames.includes("galaxies") &&
      tableNames.includes("events") &&
      tableNames.includes("chores") &&
      tableNames.includes("list_items"),
    `Mocked SQLite DB initialized with core tables (${tableNames.length} tables)`
  );

  // Import Next.js App Router API Route Handlers
  const galaxiesRoute = await import("../src/app/api/galaxies/route");
  const joinGalaxyRoute = await import("../src/app/api/galaxies/join/route");
  const membersRoute = await import("../src/app/api/galaxies/[id]/members/route");
  const eventsRoute = await import("../src/app/api/events/route");
  const choresRoute = await import("../src/app/api/chores/route");
  const listsRoute = await import("../src/app/api/lists/route");

  console.log("\n====================================================");
  console.log("👩‍🚀 2. Creating Users & Provisioning Galaxies");
  console.log("====================================================");

  const userAliceId = await ensureDbUser({
    id: "user_alice_test",
    email: "alice@jlight.test",
    name: "Captain Alice",
  });
  const userBobId = await ensureDbUser({
    id: "user_bob_test",
    email: "bob@jlight.test",
    name: "Commander Bob",
  });

  assert(Boolean(userAliceId && userBobId), "Created User Alice and User Bob in DB");

  // Sign in as User 1 (Alice)
  setMockTestSession({
    user: {
      id: userAliceId!,
      email: "alice@jlight.test",
      name: "Captain Alice",
    },
  });

  // GET /api/galaxies auto-provisions Alice's default galaxy
  const getGalaxiesRes = await galaxiesRoute.GET(
    new Request("http://localhost:3000/api/galaxies")
  );
  const getGalaxiesData = await getGalaxiesRes.json();
  assert(getGalaxiesRes.status === 200, "GET /api/galaxies succeeded for Alice");
  assert(
    Array.isArray(getGalaxiesData.galaxies) && getGalaxiesData.galaxies.length === 1,
    "Auto-provisioned Alice's initial personal galaxy"
  );

  // Create a new shared household galaxy via POST /api/galaxies
  const createGalaxyRes = await galaxiesRoute.POST(
    new Request("http://localhost:3000/api/galaxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "The Starlight Test Family",
        theme: "nebula",
        icon: "rocket",
      }),
    })
  );
  const createGalaxyData = await createGalaxyRes.json();
  assert(createGalaxyRes.status === 200 && createGalaxyData.success, "POST /api/galaxies created new galaxy");

  const sharedGalaxy = createGalaxyData.galaxy;
  const galaxyId: string = sharedGalaxy.id;
  const joinCode: string = sharedGalaxy.joinCode;
  assert(Boolean(galaxyId && joinCode.startsWith("GLX-")), `Generated valid join code: ${joinCode}`);

  // Update Whole-Family Identity via PATCH /api/galaxies
  const patchGalaxyRes = await galaxiesRoute.PATCH(
    new Request("http://localhost:3000/api/galaxies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galaxyId,
        familyColor: "#ef4444",
        familyAvatar: "constellation",
      }),
    })
  );
  assert(patchGalaxyRes.status === 200, "PATCH /api/galaxies updated Whole-Family Identity");

  // Add Kid & Pet inhabitants to the galaxy via POST /api/galaxies/[id]/members
  const addLeoRes = await membersRoute.POST(
    new Request(`http://localhost:3000/api/galaxies/${galaxyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Leo",
        role: "kid",
        color: "#8b5cf6",
        avatarIcon: "baby",
      }),
    }),
    { params: Promise.resolve({ id: galaxyId }) }
  );
  const leoData = await addLeoRes.json();
  const leoMemberId: string = leoData.member.id;

  const addMiaRes = await membersRoute.POST(
    new Request(`http://localhost:3000/api/galaxies/${galaxyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Mia",
        role: "kid",
        color: "#f59e0b",
        avatarIcon: "baby",
      }),
    }),
    { params: Promise.resolve({ id: galaxyId }) }
  );
  const miaData = await addMiaRes.json();
  const miaMemberId: string = miaData.member.id;

  const addJavaRes = await membersRoute.POST(
    new Request(`http://localhost:3000/api/galaxies/${galaxyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Java 🐕",
        role: "pet",
        color: "#06b6d4",
        avatarIcon: "dog",
      }),
    }),
    { params: Promise.resolve({ id: galaxyId }) }
  );
  const javaData = await addJavaRes.json();
  const javaMemberId: string = javaData.member.id;

  assert(
    Boolean(leoMemberId && miaMemberId && javaMemberId),
    "Added Kid (Leo, Mia) and Pet (Java) inhabitants to galaxy"
  );

  console.log("\n====================================================");
  console.log("🤝 3. Joining a Galaxy as Second User (Bob)");
  console.log("====================================================");

  // Switch active user session to User 2 (Bob)
  setMockTestSession({
    user: {
      id: userBobId!,
      email: "bob@jlight.test",
      name: "Commander Bob",
    },
  });

  // Before joining, Bob must be denied access (403) to Alice's private galaxy
  const bobPreJoinEventsRes = await eventsRoute.GET(
    new Request(`http://localhost:3000/api/events?galaxyId=${galaxyId}`)
  );
  assert(
    bobPreJoinEventsRes.status === 403,
    "Unjoined user (Bob) receives 403 Forbidden before joining private galaxy"
  );

  // Join galaxy using joinCode via POST /api/galaxies/join
  const joinRes = await joinGalaxyRoute.POST(
    new Request("http://localhost:3000/api/galaxies/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    })
  );
  const joinData = await joinRes.json();
  assert(
    joinRes.status === 200 && joinData.success && joinData.alreadyMember === false,
    `User Bob joined "${sharedGalaxy.name}" using code ${joinCode}`
  );

  // Joining a second time is idempotent
  const duplicateJoinRes = await joinGalaxyRoute.POST(
    new Request("http://localhost:3000/api/galaxies/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    })
  );
  const duplicateJoinData = await duplicateJoinRes.json();
  assert(
    duplicateJoinRes.status === 200 && duplicateJoinData.alreadyMember === true,
    "Duplicate galaxy join request is handled idempotently"
  );

  console.log("\n====================================================");
  console.log("📅 4. Creating Each Type of Event & Deleting Events");
  console.log("====================================================");

  const eventPayloads = [
    {
      label: "Single Timed Event",
      body: {
        galaxyId,
        memberId: leoMemberId,
        memberIds: [leoMemberId],
        title: "Leo Piano Lesson 🎹",
        location: "Music Studio",
        startTime: "2026-10-01T15:00:00",
        endTime: "2026-10-01T15:45:00",
        isAllDay: false,
        rrule: null,
        colorOverride: "#8b5cf6",
      },
    },
    {
      label: "All-Day Whole-Family Event",
      body: {
        galaxyId,
        memberId: null,
        memberIds: null,
        title: "Cosmic Family Campout 🏕️",
        location: "State Park",
        startTime: "2026-10-03T00:00:00",
        endTime: "2026-10-03T23:59:59",
        isAllDay: true,
        rrule: null,
        colorOverride: "#ef4444",
      },
    },
    {
      label: "Multi-Member Shared Event",
      body: {
        galaxyId,
        memberId: null,
        memberIds: [leoMemberId, miaMemberId],
        title: "Leo & Mia Science Fair 🔬",
        location: "School Gymnasium",
        startTime: "2026-10-05T13:00:00",
        endTime: "2026-10-05T15:00:00",
        isAllDay: false,
        rrule: null,
        colorOverride: "#8b5cf6",
      },
    },
    {
      label: "Daily Recurring Event",
      body: {
        galaxyId,
        memberId: javaMemberId,
        memberIds: [javaMemberId],
        title: "Java Morning Walk 🐾",
        startTime: "2026-10-01T07:30:00",
        endTime: "2026-10-01T08:00:00",
        isAllDay: false,
        rrule: "FREQ=DAILY",
        colorOverride: "#06b6d4",
      },
    },
    {
      label: "Weekday Recurring Event (Mon-Fri)",
      body: {
        galaxyId,
        memberId: leoMemberId,
        memberIds: [leoMemberId, miaMemberId],
        title: "School Bus Dropoff 🚌",
        startTime: "2026-10-01T08:15:00",
        endTime: "2026-10-01T08:45:00",
        isAllDay: false,
        rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        colorOverride: "#f59e0b",
      },
    },
    {
      label: "Weekly Recurring Event",
      body: {
        galaxyId,
        memberId: miaMemberId,
        memberIds: [miaMemberId],
        title: "Mia Gymnastics 🤸",
        startTime: "2026-10-01T17:00:00",
        endTime: "2026-10-01T18:00:00",
        isAllDay: false,
        rrule: "FREQ=WEEKLY",
        colorOverride: "#f59e0b",
      },
    },
    {
      label: "Biweekly Recurring Event",
      body: {
        galaxyId,
        memberId: null,
        memberIds: null,
        title: "Biweekly Family Budget Sync 📊",
        startTime: "2026-10-01T19:00:00",
        endTime: "2026-10-01T20:00:00",
        isAllDay: false,
        rrule: "FREQ=WEEKLY;INTERVAL=2",
        colorOverride: "#10b981",
      },
    },
    {
      label: "Monthly Recurring Event",
      body: {
        galaxyId,
        memberId: javaMemberId,
        memberIds: [javaMemberId],
        title: "Java Monthly Vet Preventative 💊",
        startTime: "2026-10-01T09:00:00",
        endTime: "2026-10-01T09:30:00",
        isAllDay: false,
        rrule: "FREQ=MONTHLY",
        colorOverride: "#06b6d4",
      },
    },
  ];

  const createdEventIds: Record<string, string> = {};

  for (const item of eventPayloads) {
    const res = await eventsRoute.POST(
      new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      })
    );
    const data = await res.json();
    assert(res.status === 200 && data.success && data.event?.id, `Created ${item.label}`);
    createdEventIds[item.label] = data.event.id;
  }

  // Fetch all events in the galaxy (1 welcome event + 8 created events = 9 base events)
  const listEventsRes = await eventsRoute.GET(
    new Request(`http://localhost:3000/api/events?galaxyId=${galaxyId}`)
  );
  const listEventsData = await listEventsRes.json();
  assert(
    listEventsRes.status === 200 && listEventsData.events.length === 9,
    `Fetched all 9 persisted events in galaxy (got ${listEventsData.events.length})`
  );

  // Edit an existing event via PATCH /api/events
  const singleEventId = createdEventIds["Single Timed Event"];
  const patchEventRes = await eventsRoute.PATCH(
    new Request("http://localhost:3000/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: singleEventId,
        title: "Leo Piano Recital Prep 🎹",
        endTime: "2026-10-01T16:00:00",
      }),
    })
  );
  assert(patchEventRes.status === 200, "PATCH /api/events updated event title and endTime");

  // Delete a single occurrence of the Biweekly Recurring Event (Oct 15, 2026) via exdate
  const biweeklyEventId = createdEventIds["Biweekly Recurring Event"];
  const deleteOccurrenceRes = await eventsRoute.DELETE(
    new Request(
      `http://localhost:3000/api/events?id=${encodeURIComponent(biweeklyEventId)}&exdate=2026-10-15`,
      { method: "DELETE" }
    )
  );
  const deleteOccurrenceData = await deleteOccurrenceRes.json();
  assert(
    deleteOccurrenceRes.status === 200 &&
      deleteOccurrenceData.deletedOccurrence === "2026-10-15" &&
      deleteOccurrenceData.exdates.includes("2026-10-15"),
    "DELETE /api/events with exdate excluded single occurrence (2026-10-15) without deleting series"
  );

  // Verify recurrence expansion skips the deleted occurrence
  const afterExdateRes = await eventsRoute.GET(
    new Request(`http://localhost:3000/api/events?galaxyId=${galaxyId}`)
  );
  const afterExdateEvents = (await afterExdateRes.json()).events;
  const dbBiweekly = afterExdateEvents.find((e: any) => e.id === biweeklyEventId);
  const expandedBiweekly = expandRecurringEvents(
    [
      {
        ...dbBiweekly,
        date: dbBiweekly.startTime.split("T")[0],
        time: "19:00",
      },
    ],
    new Date(2026, 9, 1),
    new Date(2026, 9, 31)
  );
  assert(
    expandedBiweekly.length === 2 &&
      expandedBiweekly.every((e) => e.date !== "2026-10-15"),
    "Recurrence expansion over DB event respects exdates and yields 2 remaining October occurrences"
  );

  // Delete an entire recurring event series (Weekly Recurring Event)
  const weeklyEventId = createdEventIds["Weekly Recurring Event"];
  const deleteSeriesRes = await eventsRoute.DELETE(
    new Request(`http://localhost:3000/api/events?id=${encodeURIComponent(weeklyEventId)}`, {
      method: "DELETE",
    })
  );
  const deleteSeriesData = await deleteSeriesRes.json();
  assert(
    deleteSeriesRes.status === 200 && deleteSeriesData.deletedSeries === true,
    "DELETE /api/events without exdate deleted entire recurring series"
  );

  // Delete a non-recurring event (Single Timed Event)
  const deleteSingleRes = await eventsRoute.DELETE(
    new Request(`http://localhost:3000/api/events?id=${encodeURIComponent(singleEventId)}`, {
      method: "DELETE",
    })
  );
  assert(deleteSingleRes.status === 200, "DELETE /api/events removed non-recurring event");

  console.log("\n====================================================");
  console.log("⭐ 5. Creating, Toggling, Editing & Deleting Chores");
  console.log("====================================================");

  const choreTypes = [
    { title: "Make Bed", recurrenceType: "daily", points: 2, memberId: leoMemberId },
    { title: "Take Out Recycling", recurrenceType: "weekly", points: 3, memberId: leoMemberId },
    { title: "Deep Clean Toy Bin", recurrenceType: "biweekly", points: 5, memberId: miaMemberId },
    { title: "Pack Campout Sleeping Bag", recurrenceType: "one_time", points: 5, memberId: leoMemberId },
  ];

  const createdChoreIds: string[] = [];
  for (const c of choreTypes) {
    const res = await choresRoute.POST(
      new Request("http://localhost:3000/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...c,
          galaxyId,
          dueTime: "18:00",
        }),
      })
    );
    const data = await res.json();
    assert(res.status === 200 && data.success && data.id, `Created ${c.recurrenceType} chore: "${c.title}"`);
    createdChoreIds.push(data.id);
    // Small delay to ensure unique Date.now() IDs
    await new Promise((r) => setTimeout(r, 5));
  }

  // Toggle chore completion & verify star rewards
  const targetChoreId = createdChoreIds[0]; // "Make Bed" (2 stars for Leo)
  const completeChoreRes = await choresRoute.PATCH(
    new Request("http://localhost:3000/api/chores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choreId: targetChoreId,
        date: "2026-10-11",
      }),
    })
  );
  const completeChoreData = await completeChoreRes.json();
  assert(
    completeChoreRes.status === 200 &&
      completeChoreData.completed === true &&
      completeChoreData.starBalances["Leo"] === 2,
    "PATCH /api/chores marked chore completed and awarded +2 stars to Leo"
  );

  // Edit chore via PUT /api/chores
  const putChoreRes = await choresRoute.PUT(
    new Request("http://localhost:3000/api/chores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choreId: targetChoreId,
        title: "Make Bed & Fluff Pillows",
        memberId: leoMemberId,
        points: 3,
        recurrenceType: "daily",
        dueTime: "08:30",
      }),
    })
  );
  assert(putChoreRes.status === 200, "PUT /api/chores updated chore details");

  // Delete a chore via DELETE /api/chores
  const deleteChoreRes = await choresRoute.DELETE(
    new Request(`http://localhost:3000/api/chores?choreId=${encodeURIComponent(createdChoreIds[3])}`, {
      method: "DELETE",
    })
  );
  assert(deleteChoreRes.status === 200, "DELETE /api/chores deleted chore");

  console.log("\n====================================================");
  console.log("🛒 6. Creating, Toggling & Deleting Shared Lists");
  console.log("====================================================");

  const listPayloads = [
    { title: "Organic Whole Milk", listType: "grocery", addedByMemberId: leoMemberId },
    { title: "Sourdough Loaf", listType: "grocery", addedByMemberId: miaMemberId },
    { title: "Honeycrisp Apples", listType: "grocery", addedByMemberId: leoMemberId },
    { title: "Flashlights & Batteries", listType: "packing", addedByMemberId: leoMemberId },
  ];

  const createdListIds: string[] = [];
  for (const item of listPayloads) {
    const res = await listsRoute.POST(
      new Request("http://localhost:3000/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          galaxyId,
        }),
      })
    );
    const data = await res.json();
    assert(res.status === 200 && data.success && data.id, `Created ${item.listType} list item: "${item.title}"`);
    createdListIds.push(data.id);
    await new Promise((r) => setTimeout(r, 5));
  }

  // Fetch grocery list items
  const getGroceryRes = await listsRoute.GET(
    new Request(`http://localhost:3000/api/lists?galaxyId=${galaxyId}&type=grocery`)
  );
  const getGroceryData = await getGroceryRes.json();
  assert(
    getGroceryRes.status === 200 && getGroceryData.items.length === 3,
    "GET /api/lists returned all 3 grocery items with member attribution"
  );

  // Mark first grocery item completed via PATCH /api/lists
  const toggleListRes = await listsRoute.PATCH(
    new Request("http://localhost:3000/api/lists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createdListIds[0],
        completed: true,
      }),
    })
  );
  assert(toggleListRes.status === 200, "PATCH /api/lists marked grocery item as completed");

  // Clear completed items via DELETE /api/lists?action=clear-completed
  const clearCompletedRes = await listsRoute.DELETE(
    new Request(
      `http://localhost:3000/api/lists?action=clear-completed&galaxyId=${encodeURIComponent(galaxyId)}`,
      { method: "DELETE" }
    )
  );
  assert(
    clearCompletedRes.status === 200,
    "DELETE /api/lists?action=clear-completed removed completed items"
  );

  // Delete single list item via DELETE /api/lists?id=...
  const deleteSingleItemRes = await listsRoute.DELETE(
    new Request(`http://localhost:3000/api/lists?id=${encodeURIComponent(createdListIds[1])}`, {
      method: "DELETE",
    })
  );
  assert(deleteSingleItemRes.status === 200, "DELETE /api/lists?id=... deleted single list item");

  // Verify 1 grocery item ("Honeycrisp Apples") remains
  const finalGroceryRes = await listsRoute.GET(
    new Request(`http://localhost:3000/api/lists?galaxyId=${galaxyId}&type=grocery`)
  );
  const finalGroceryData = await finalGroceryRes.json();
  assert(
    finalGroceryData.items.length === 1 && finalGroceryData.items[0].title === "Honeycrisp Apples",
    "Verified remaining grocery list state after deletions"
  );

  // Close client & clean up temporary SQLite DB files
  client.close();
  cleanupDbFiles();

  console.log("\n✨ All mocked system & database integration tests passed successfully!");
}

runSystemTests().catch((err) => {
  console.error("Unhandled error in system test suite:", err);
  cleanupDbFiles();
  process.exit(1);
});
