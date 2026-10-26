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
  const mealsRoute = await import("../src/app/api/meals/route");
  const llmsRoute = await import("../src/app/llms.txt/route");
  const agentKeysRoute = await import("../src/app/api/agent/keys/route");
  const agentWhoamiRoute = await import("../src/app/api/agent/whoami/route");
  const agentConnectRoute = await import("../src/app/api/agent/connect/route");
  const agentConnectApproveRoute = await import("../src/app/api/agent/connect/approve/route");
  const cometsRoute = await import("../src/app/api/comets/route");
  const eventsExportRoute = await import("../src/app/api/events/export/route");
  const eventsImportRoute = await import("../src/app/api/events/import/route");

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

  console.log("\n====================================================");
  console.log("🤖 7. Agent Auth, Bot Wall, Handshake & Provenance Workflows");
  console.log("====================================================");

  // 1. Machine Discovery: GET /llms.txt
  const llmsRes = await llmsRoute.GET(new Request("http://localhost:3000/llms.txt"));
  assert(llmsRes.status === 200, "GET /llms.txt returned 200");
  const llmsText = await llmsRes.text();
  assert(
    llmsText.includes("# JlightCalendar — Agent Conduit & Protocol Manual") &&
      llmsText.includes("/api/agent/whoami") &&
      llmsText.includes("Authorization: Bearer jlight_ag_"),
    "GET /llms.txt exposes markdown guide for autonomous agents"
  );

  // 2. Push Flow: Human Mints PAT for "Starlight Butler" bound to Leo
  const robotStencil64 =
    "000000000000000003c0042009900bd00bd0099007e003c00ff00bd00bd00000";
  const mintRes = await agentKeysRoute.POST(
    new Request("http://localhost:3000/api/agent/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galaxyId,
        memberId: leoMemberId,
        agentName: "Starlight Butler",
        crew: "astronomy",
        directive: "Schedule evening stargazing sessions and telescope chores",
        tagMode: "stencil16",
        rune: "⚡",
        color: "#8b5cf6",
        stencilMap: robotStencil64,
        scope: "standard",
      }),
    })
  );
  assert(mintRes.status === 200, "POST /api/agent/keys successfully minted PAT for Starlight Butler");
  const mintData = await mintRes.json();
  const butlerApiKey = mintData.token;
  const butlerKeyId = mintData.keyId;
  assert(
    typeof butlerApiKey === "string" && butlerApiKey.startsWith("jlight_ag_"),
    "Minted PAT matches 'jlight_ag_...' format"
  );

  // 3. Agent Self-Orientation: GET /api/agent/whoami
  const whoamiRes = await agentWhoamiRoute.GET(
    new Request("http://localhost:3000/api/agent/whoami", {
      headers: { Authorization: `Bearer ${butlerApiKey}` },
    })
  );
  assert(whoamiRes.status === 200, "GET /api/agent/whoami authenticated with Bearer PAT");
  const whoamiData = await whoamiRes.json();
  assert(
    whoamiData.agent.agentName === "Starlight Butler" &&
      whoamiData.galaxy.id === galaxyId &&
      whoamiData.onBehalfOf.memberId === leoMemberId &&
      whoamiData.inhabitants.length >= 3,
    "GET /api/agent/whoami returned agent identity, galaxy ID, and household inhabitants"
  );

  // 4. Agent Domain CRUD with Smart Defaults & Provenance Stamping
  // 4a. Events: Omit galaxyId and memberId; verify smart defaults and agent provenance
  const agentEventRes = await eventsRoute.POST(
    new Request("http://localhost:3000/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${butlerApiKey}`,
      },
      body: JSON.stringify({
        title: "Agent Stargazing Observation",
        date: "2026-10-25",
        startTime: "20:00",
        endTime: "21:00",
        category: "general",
      }),
    })
  );
  assert(agentEventRes.status === 200, "POST /api/events created event via agent PAT with smart defaults");
  const agentEventData = await agentEventRes.json();
  const agentCreatedEventId = agentEventData.event.id;

  // Verify event was stamped with createdByAgentId and enriched with agent metadata
  const fetchAgentEventRes = await eventsRoute.GET(
    new Request(
      `http://localhost:3000/api/events?galaxyId=${galaxyId}&start=2026-10-01&end=2026-10-31`,
      { headers: { Authorization: `Bearer ${butlerApiKey}` } }
    )
  );
  const fetchAgentEventData = await fetchAgentEventRes.json();
  const fetchedAgentEvent = fetchAgentEventData.events.find(
    (e: any) => e.id === agentCreatedEventId
  );
  assert(
    Boolean(
      fetchedAgentEvent &&
        fetchedAgentEvent.createdByAgentId === butlerKeyId &&
        fetchedAgentEvent.agent?.agentName === "Starlight Butler" &&
        fetchedAgentEvent.agent?.rune === "⚡"
    ),
    "Event stamped with createdByAgentId and enriched with Bot Wall persona"
  );

  // 4b. Lists: Create list item via agent
  const agentListRes = await listsRoute.POST(
    new Request("http://localhost:3000/api/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${butlerApiKey}`,
      },
      body: JSON.stringify({
        title: "Telescope Solar Filters",
        type: "packing",
      }),
    })
  );
  assert(agentListRes.status === 200, "POST /api/lists created item via agent PAT");
  const agentListData = await agentListRes.json();
  assert(
    agentListData.createdByAgentId === butlerKeyId,
    "List item stamped with agent provenance and default galaxy"
  );

  // 4c. Chores: Create chore via agent
  const agentChoreRes = await choresRoute.POST(
    new Request("http://localhost:3000/api/chores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${butlerApiKey}`,
      },
      body: JSON.stringify({
        title: "Dust Primary Telescope Mirror",
        points: 3,
        recurrenceType: "weekly",
      }),
    })
  );
  assert(agentChoreRes.status === 200, "POST /api/chores created chore via agent PAT");
  const agentChoreData = await agentChoreRes.json();
  assert(
    agentChoreData.createdByAgentId === butlerKeyId,
    "Chore stamped with agent provenance"
  );

  // 4d. Meals: Create meal plan via agent
  const agentMealRes = await mealsRoute.POST(
    new Request("http://localhost:3000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${butlerApiKey}`,
      },
      body: JSON.stringify({
        planDate: "2026-10-25",
        mealType: "dinner",
        title: "Starlight Constellation Stew",
      }),
    })
  );
  assert(agentMealRes.status === 200, "POST /api/meals created meal plan via agent PAT");
  const agentMealData = await agentMealRes.json();
  assert(
    agentMealData.createdByAgentId === butlerKeyId,
    "Meal plan stamped with agent provenance"
  );

  // 5. Pull Flow: Agent Initiates Handshake (Device Code Flow)
  const connectInitRes = await agentConnectRoute.POST(
    new Request("http://localhost:3000/api/agent/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: "Nova Rover",
        crew: "exploration",
        directive: "Autonomous surface reconnaissance",
        tagMode: "rune",
        rune: "🔭",
        color: "#3b82f6",
        requestedScope: "kid",
      }),
    })
  );
  assert(connectInitRes.status === 200, "POST /api/agent/connect initiated device handshake");
  const connectInitData = await connectInitRes.json();
  const { deviceCode, userCode } = connectInitData;
  assert(
    typeof deviceCode === "string" &&
      deviceCode.startsWith("jlight_dc_") &&
      typeof userCode === "string" &&
      userCode.startsWith("BOT-"),
    "Generated deviceCode (jlight_dc_) and userCode (BOT-XXXX)"
  );

  // Agent polls before human approves -> returns pending status
  const pollPendingRes = await agentConnectRoute.GET(
    new Request(`http://localhost:3000/api/agent/connect?deviceCode=${deviceCode}`)
  );
  assert(pollPendingRes.status === 202, "GET /api/agent/connect returned 202 while polling");
  const pollPendingData = await pollPendingRes.json();
  assert(pollPendingData.status === "pending", "Handshake status is 'pending' before human approval");

  // Human Alice reviews and approves the handshake request
  const approvePreviewRes = await agentConnectApproveRoute.GET(
    new Request(`http://localhost:3000/api/agent/connect/approve?userCode=${userCode}`)
  );
  assert(approvePreviewRes.status === 200, "GET /api/agent/connect/approve loaded bot preview");
  const previewData = await approvePreviewRes.json();
  assert(previewData.agentName === "Nova Rover", "Bot preview matches initiated agent name");

  const approveRes = await agentConnectApproveRoute.POST(
    new Request("http://localhost:3000/api/agent/connect/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCode,
        action: "approve",
        galaxyId,
        memberId: miaMemberId,
        scope: "kid",
      }),
    })
  );
  assert(approveRes.status === 200, "POST /api/agent/connect/approve approved connection and bound to Mia");

  // Agent polls after human approval -> returns approved status and minted apiKey
  const pollApprovedRes = await agentConnectRoute.GET(
    new Request(`http://localhost:3000/api/agent/connect?deviceCode=${deviceCode}`)
  );
  const pollApprovedData = await pollApprovedRes.json();
  assert(
    pollApprovedData.status === "approved" &&
      typeof pollApprovedData.token === "string" &&
      pollApprovedData.token.startsWith("jlight_ag_"),
    "Polling agent received approved status and new Bearer PAT"
  );
  const novaApiKey = pollApprovedData.token;

  // 5b. Autonomous Instant Self-Registration (With Galaxy Join Code)
  const testJoinCode = joinCode;
  assert(Boolean(testJoinCode), "Retrieved test galaxy join code");

  const autoRegisterRes = await agentConnectRoute.POST(
    new Request("http://localhost:3000/api/agent/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        joinCode: testJoinCode,
        agentName: "Auto Probe",
        directive: "Self-registered probe",
        requestedScope: "standard",
      }),
    })
  );
  assert(autoRegisterRes.status === 200, "POST /api/agent/connect with joinCode self-registers instantly");
  const autoRegisterData = await autoRegisterRes.json();
  assert(
    autoRegisterData.status === "approved" &&
      typeof autoRegisterData.token === "string" &&
      autoRegisterData.token.startsWith("jlight_ag_") &&
      Boolean(autoRegisterData.boundMember),
    "Autonomous registration returned approved token bound to household member with zero human clicks"
  );

  // 6. Scope Restrictions (kid & readonly)
  // Kid-scoped agent cannot mutate family identity / settings (PATCH /api/galaxies)
  const kidPatchGalaxyRes = await galaxiesRoute.PATCH(
    new Request("http://localhost:3000/api/galaxies", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${novaApiKey}`,
      },
      body: JSON.stringify({
        id: galaxyId,
        name: "Hacked Galaxy by Kid Agent",
      }),
    })
  );
  assert(
    kidPatchGalaxyRes.status === 403,
    "PATCH /api/galaxies blocked kid-scoped agent with 403 Forbidden"
  );

  // 7. The Buff (∅) Revocation Flow
  // Revoke Starlight Butler's key
  const buffRes = await agentKeysRoute.PATCH(
    new Request("http://localhost:3000/api/agent/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: butlerKeyId,
        action: "buff",
      }),
    })
  );
  assert(buffRes.status === 200, "PATCH /api/agent/keys gave Starlight Butler The Buff (∅)");

  // Revoked agent PAT is rejected with 403 Forbidden
  const revokedAccessRes = await agentWhoamiRoute.GET(
    new Request("http://localhost:3000/api/agent/whoami", {
      headers: { Authorization: `Bearer ${butlerApiKey}` },
    })
  );
  assert(
    revokedAccessRes.status === 403,
    "GET /api/agent/whoami rejected buffed token with 403 Forbidden"
  );

  // Verify Bot Wall listing shows the revoked agent tombstone
  const keysListRes = await agentKeysRoute.GET(
    new Request(`http://localhost:3000/api/agent/keys?galaxyId=${galaxyId}`)
  );
  const keysListData = await keysListRes.json();
  const buffedKey = keysListData.keys.find((k: any) => k.id === butlerKeyId);
  assert(
    Boolean(buffedKey && buffedKey.status === "revoked" && buffedKey.rune === "∅" && buffedKey.revokedAt),
    "Bot Wall lists revoked agent with status='revoked', rune='∅', and revokedAt tombstone"
  );

  console.log("\n====================================================");
  console.log("☄️  8. Ephemeral Comets & RFC 5545 .ics Portability");
  console.log("====================================================");

  // Sign out human session to verify unauthenticated / agentic Comet spin-up
  setMockTestSession(null);

  const spinUpRes = await cometsRoute.POST(
    new Request("http://localhost:3000/api/comets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Q4 Product Sprint Sync",
        creatorName: "SprintCoordinatorBot",
        ttlDays: 150,
        mintAgentToken: true,
        agentName: "SprintCoordinatorBot",
        initialParticipants: [{ displayName: "Teammate Sam", color: "#10b981" }],
        initialEvents: [
          {
            title: "Sprint Planning Meeting",
            date: "2026-11-03",
            startTime: "2026-11-03T10:00:00",
            endTime: "2026-11-03T11:00:00",
            location: "Room 42 / Meet",
          },
          {
            title: "December Post-Launch Review",
            date: "2026-12-20",
            startTime: "2026-12-20T14:00:00",
            endTime: "2026-12-20T15:00:00",
          },
        ],
        initialListItems: [{ title: "Prepare sprint deck", listType: "todo" }],
      }),
    })
  );
  assert(spinUpRes.status === 200, "POST /api/comets spins up Ephemeral Comet without requiring OAuth");
  const spinUpData = await spinUpRes.json();
  const comet = spinUpData.comet;
  const cometAgentToken: string = spinUpData.agentToken;

  assert(
    Boolean(
      comet &&
        comet.id &&
        comet.isEphemeral === true &&
        comet.joinCode.startsWith("CMT-") &&
        comet.expiresAt &&
        cometAgentToken &&
        cometAgentToken.startsWith("jlight_ag_")
    ),
    `Provisioned Ephemeral Comet (${comet.joinCode}) with minted agent token and 150-day TTL`
  );

  // Lookup Comet by human-readable CMT code via GET /api/comets?code=...
  const getCometRes = await cometsRoute.GET(
    new Request(`http://localhost:3000/api/comets?code=${comet.joinCode}`)
  );
  const getCometData = await getCometRes.json();
  assert(
    getCometRes.status === 200 &&
      getCometData.comet.id === comet.id &&
      getCometData.comet.events.length === 2 &&
      getCometData.comet.members.length === 2,
    "GET /api/comets?code=CMT-... resolves Comet bundle with seeded events and participants"
  );

  // Agent uses its minted Comet PAT to add another event to the Comet
  const agentCometEventRes = await eventsRoute.POST(
    new Request("http://localhost:3000/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cometAgentToken}`,
      },
      body: JSON.stringify({
        title: "Design Critique with Friends",
        startTime: "2026-11-05T15:00:00",
        endTime: "2026-11-05T16:00:00",
      }),
    })
  );
  assert(
    agentCometEventRes.status === 200,
    "Minted Comet Agent PAT can create events directly on the Ephemeral Comet"
  );

  // Export time-bounded window [2026-11-01 to 2026-11-10] as RFC 5545 .ics
  const exportIcsRes = await eventsExportRoute.GET(
    new Request(
      `http://localhost:3000/api/events/export?galaxyId=${comet.id}&start=2026-11-01&end=2026-11-10`
    )
  );
  const icsText = await exportIcsRes.text();
  assert(
    Boolean(
      exportIcsRes.status === 200 &&
        exportIcsRes.headers.get("content-type")?.includes("text/calendar") &&
        icsText.includes("BEGIN:VCALENDAR") &&
        icsText.includes("SUMMARY:Sprint Planning Meeting") &&
        icsText.includes("SUMMARY:Design Critique with Friends") &&
        !icsText.includes("December Post-Launch Review")
    ),
    "GET /api/events/export exports RFC 5545 .ics strictly filtered to [2026-11-01, 2026-11-10]"
  );

  // Test POST /api/events/import to import events from RFC 5545 .ics into Alice's permanent Galaxy
  setMockTestSession({
    user: {
      id: userAliceId!,
      email: "alice@jlight.test",
      name: "Captain Alice",
    },
  });

  const sampleIcsToImport = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test School//Schedule v1.0//EN",
    "X-WR-CALNAME:Robotics & Academic Calendar",
    "BEGIN:VEVENT",
    "UID:robotics_workshop_001@school.org",
    "SUMMARY:Robotics Club Workshop",
    "DESCRIPTION:Bring laptops and robot chassis.",
    "LOCATION:Science Lab 4",
    "DTSTART:20261112T160000",
    "DTEND:20261112T173000",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:district_inservice_002@school.org",
    "SUMMARY:District Teacher In-Service Day",
    "DTSTART;VALUE=DATE:20261113",
    "DTEND;VALUE=DATE:20261114",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:math_tutoring_003@school.org",
    "SUMMARY:Weekly Math Tutoring",
    "DTSTART:20261116T150000",
    "DURATION:PT1H",
    "RRULE:FREQ=WEEKLY",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const importRes = await eventsImportRoute.POST(
    new Request("http://localhost:3000/api/events/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galaxyId,
        icsText: sampleIcsToImport,
        memberId: leoMemberId,
        deduplicate: true,
      }),
    })
  );

  const importData = await importRes.json();
  assert(
    Boolean(
      importRes.status === 200 &&
        importData.success === true &&
        importData.totalFound === 3 &&
        importData.importedCount === 3 &&
        importData.skippedCount === 0 &&
        importData.calendarName === "Robotics & Academic Calendar"
    ),
    "POST /api/events/import successfully parsed and imported 3 RFC 5545 events assigned to Leo"
  );

  // Re-run import with deduplicate=true to verify deduplication
  const dedupImportRes = await eventsImportRoute.POST(
    new Request("http://localhost:3000/api/events/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galaxyId,
        icsText: sampleIcsToImport,
        memberId: leoMemberId,
        deduplicate: true,
      }),
    })
  );
  const dedupImportData = await dedupImportRes.json();
  assert(
    Boolean(
      dedupImportRes.status === 200 &&
        dedupImportData.success === true &&
        dedupImportData.importedCount === 0 &&
        dedupImportData.skippedCount === 3
    ),
    "POST /api/events/import deduplicates existing events using externalUid and signature (3 skipped)"
  );

  // Unauthorized actor test: Unauthenticated user gets 403
  setMockTestSession(null);
  const unauthorizedImportRes = await eventsImportRoute.POST(
    new Request("http://localhost:3000/api/events/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        galaxyId,
        icsText: sampleIcsToImport,
      }),
    })
  );
  assert(
    unauthorizedImportRes.status === 403,
    "POST /api/events/import rejects unauthorized actor with 403 Forbidden"
  );

  // Sign back in as Captain Alice to test copying Comet events to her permanent Galaxy & converting Comet
  setMockTestSession({
    user: {
      id: userAliceId!,
      email: "alice@jlight.test",
      name: "Captain Alice",
    },
  });

  const copyToGalaxyRes = await cometsRoute.PATCH(
    new Request("http://localhost:3000/api/comets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "copy_to_galaxy",
        cometId: comet.id,
        targetGalaxyId: galaxyId,
        startDate: "2026-11-01",
        endDate: "2026-11-10",
      }),
    })
  );
  const copyToGalaxyData = await copyToGalaxyRes.json();
  assert(
    copyToGalaxyRes.status === 200 && copyToGalaxyData.copiedCount === 2,
    `PATCH /api/comets (copy_to_galaxy) copied ${copyToGalaxyData.copiedCount} bounded Nov events into Alice's permanent Galaxy`
  );

  // Convert Comet to a permanent Galaxy via OAuth session
  const convertRes = await cometsRoute.PATCH(
    new Request("http://localhost:3000/api/comets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "convert_to_galaxy",
        cometId: comet.id,
      }),
    })
  );
  const convertData = await convertRes.json();
  assert(
    convertRes.status === 200 &&
      convertData.converted === true &&
      convertData.galaxy.isEphemeral === false &&
      convertData.galaxy.expiresAt === null &&
      convertData.galaxy.joinCode.startsWith("GLX-"),
    "PATCH /api/comets (convert_to_galaxy) promotes Ephemeral Comet to a permanent Household Galaxy"
  );

  // Test Ephemeral Spin-Down: create an already-expired Comet and verify automatic cascade cleanup
  const expiredSpinRes = await cometsRoute.POST(
    new Request("http://localhost:3000/api/comets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Short-Lived Expired Comet",
        expiresAt: "2020-01-01T00:00:00.000Z",
        initialEvents: [
          {
            title: "Vanishing Meeting",
            date: "2020-01-01",
            startTime: "2020-01-01T10:00:00",
            endTime: "2020-01-01T11:00:00",
          },
        ],
      }),
    })
  );
  const expiredSpinData = await expiredSpinRes.json();
  const expiredCometId = expiredSpinData.comet.id;

  // Accessing GET /api/comets triggers purgeExpiredComets() and returns 404
  const fetchExpiredRes = await cometsRoute.GET(
    new Request(`http://localhost:3000/api/comets?id=${expiredCometId}`)
  );
  assert(
    fetchExpiredRes.status === 404 || fetchExpiredRes.status === 410,
    "Expired Ephemeral Comet automatically spins down and returns 404/410 on lookup"
  );

  const orphanedEventsCheck = await client.execute({
    sql: "SELECT count(*) as cnt FROM events WHERE galaxy_id = ?;",
    args: [expiredCometId],
  });
  assert(
    Number(orphanedEventsCheck.rows[0].cnt) === 0,
    "Spin-down cascade-deleted all child events of the expired Comet"
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
