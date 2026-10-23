import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureDatabaseSchema, purgeExpiredComets } from "@/db/ensure-schema";
import {
  galaxies,
  galaxyMembers,
  calendars,
  events,
  listItems,
  agentKeys,
  generateCometCode,
  generateCometSlug,
  generateJoinCode,
  normalizeJoinCode,
} from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { auth } from "@/auth";
import { ensureDbUser } from "@/lib/auth-helpers";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  generateAgentPat,
  sanitizeRune,
  recordAgentAction,
} from "@/lib/agent-auth";
import { filterEventsForTimeWindow } from "@/lib/ics";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();

    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);
    const rawIdentifier =
      searchParams.get("id") ||
      searchParams.get("code") ||
      searchParams.get("slug") ||
      searchParams.get("comet") ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Comet id, code (CMT-XXXX-XXXX), or slug is required." },
        { status: 400 }
      );
    }

    const trimmed = rawIdentifier.trim();
    const normalizedCode = normalizeJoinCode(trimmed);

    const matched = await db
      .select()
      .from(galaxies)
      .where(
        or(
          eq(galaxies.id, trimmed),
          eq(galaxies.joinCode, normalizedCode),
          eq(galaxies.joinCode, trimmed.toUpperCase()),
          eq(galaxies.slug, trimmed.toLowerCase())
        )
      )
      .limit(1);

    if (matched.length === 0) {
      return NextResponse.json(
        { error: "Ephemeral Comet not found or has already spun down." },
        { status: 404 }
      );
    }

    const target = matched[0];

    // Check expiration if ephemeral
    if (
      target.isEphemeral &&
      target.expiresAt &&
      new Date(target.expiresAt).getTime() <= Date.now()
    ) {
      await purgeExpiredComets();
      return NextResponse.json(
        { error: "This ephemeral Comet has expired and spun down." },
        { status: 410 }
      );
    }

    // Verify access (always true for active ephemeral comets; checks membership for galaxies)
    const access = await verifyActorGalaxyAccess(actor, target.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "Forbidden" },
        { status: access.status || 403 }
      );
    }

    const [members, galaxyCalendars, galaxyEvents, galaxyLists] =
      await Promise.all([
        db
          .select()
          .from(galaxyMembers)
          .where(eq(galaxyMembers.galaxyId, target.id)),
        db.select().from(calendars).where(eq(calendars.galaxyId, target.id)),
        db.select().from(events).where(eq(events.galaxyId, target.id)),
        db.select().from(listItems).where(eq(listItems.galaxyId, target.id)),
      ]);

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      comet: {
        ...target,
        members,
        calendars: galaxyCalendars,
        events: galaxyEvents,
        lists: galaxyLists,
        shareUrl: `/?comet=${target.joinCode || target.id}`,
        exportIcsUrl: `/api/events/export?galaxyId=${target.id}`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch Comet:", error);
    return NextResponse.json(
      { error: "Failed to fetch Comet" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();

    const actor = await resolveRequestActor(req);
    const session = await auth();
    let userId = session?.user?.id || null;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const body = await req.json();
    const {
      name,
      creatorName: rawCreatorName,
      creatorColor = "#06b6d4",
      ttlDays: rawTtlDays = 150, // Default ~5 months (150 days)
      expiresAt: customExpiresAt,
      slug: rawSlug,
      theme = "nebula",
      icon = "sparkles",
      mintAgentToken = false,
      agentName,
      crew,
      directive,
      rune = "☄",
      initialParticipants = [],
      initialEvents = [],
      initialListItems = [],
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Comet name is required." },
        { status: 400 }
      );
    }

    const cometName = name.trim();
    const cometId = crypto.randomUUID();
    const joinCode = generateCometCode();
    const slug =
      rawSlug && typeof rawSlug === "string" && rawSlug.trim()
        ? rawSlug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
        : generateCometSlug(cometName);

    const ttlDays =
      typeof rawTtlDays === "number" && rawTtlDays > 0 ? rawTtlDays : 150;
    const expiresAt =
      customExpiresAt && typeof customExpiresAt === "string"
        ? customExpiresAt
        : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert Ephemeral Comet row into galaxies
    await db.insert(galaxies).values({
      id: cometId,
      name: cometName,
      slug,
      theme: ["milky-way", "andromeda", "nebula", "supernova"].includes(theme)
        ? theme
        : "nebula",
      icon,
      ownerId: userId,
      parentPin: "1234",
      joinCode,
      familyColor: creatorColor,
      familyAvatar: "comet",
      isEphemeral: true,
      expiresAt,
    });

    // 2. Insert creator/host member
    const hostMemberId = crypto.randomUUID();
    const hostDisplayName =
      (rawCreatorName && String(rawCreatorName).trim()) ||
      session?.user?.name ||
      (agentName && String(agentName).trim()) ||
      "Comet Host";

    const createdMembers: Array<{
      id: string;
      galaxyId: string;
      userId: string | null;
      displayName: string;
      role: "owner" | "admin" | "member" | "viewer" | "kid" | "pet";
      color: string;
      avatarIcon: string;
    }> = [
      {
        id: hostMemberId,
        galaxyId: cometId,
        userId,
        displayName: hostDisplayName,
        role: "owner",
        color: creatorColor,
        avatarIcon: "user",
      },
    ];

    await db.insert(galaxyMembers).values(createdMembers[0]);

    // Optional additional initial participants
    const palette = ["#ec4899", "#10b981", "#8b5cf6", "#f59e0b", "#3b82f6"];
    if (Array.isArray(initialParticipants)) {
      for (let i = 0; i < initialParticipants.length; i++) {
        const p = initialParticipants[i];
        const pName =
          typeof p === "string" ? p.trim() : p?.displayName?.trim();
        if (!pName) continue;
        const pMember = {
          id: crypto.randomUUID(),
          galaxyId: cometId,
          userId: null,
          displayName: pName,
          role: (p?.role || "member") as
            | "owner"
            | "admin"
            | "member"
            | "viewer"
            | "kid"
            | "pet",
          color: p?.color || palette[i % palette.length],
          avatarIcon: p?.avatarIcon || "user",
        };
        await db.insert(galaxyMembers).values(pMember);
        createdMembers.push(pMember);
      }
    }

    // 3. Create Primary Comet Calendar
    const calendarId = crypto.randomUUID();
    await db.insert(calendars).values({
      id: calendarId,
      galaxyId: cometId,
      name: "Comet Orbit",
      isPrimary: true,
      color: creatorColor,
    });

    // 4. Optionally mint an Agent PAT bound to this Comet ("Agentically Owned Calendar")
    let mintedAgentToken: string | null = null;
    let mintedAgentId: string | null =
      actor.kind === "agent" ? actor.agent.id : null;

    if (mintAgentToken || agentName) {
      const pat = generateAgentPat();
      const newAgentId = crypto.randomUUID();
      mintedAgentToken = pat.rawToken;
      mintedAgentId = newAgentId;

      await db.insert(agentKeys).values({
        id: newAgentId,
        galaxyId: cometId,
        memberId: hostMemberId,
        createdByUserId: userId,
        tokenHash: pat.tokenHash,
        keyPrefix: pat.keyPrefix,
        agentName: (agentName && String(agentName).trim()) || `${cometName} Envoy`,
        crew: crew ? String(crew).trim() : "Ephemeral Comets",
        directive: directive
          ? String(directive).trim()
          : `Coordinate ${cometName} until ${expiresAt.split("T")[0]}`,
        tagMode: "rune",
        rune: sanitizeRune(rune || "☄"),
        color: creatorColor,
        scope: "admin",
        status: "active",
      });
    }

    // 5. Seed initial events (or welcoming Comet creation event)
    const createdEvents: any[] = [];
    if (Array.isArray(initialEvents) && initialEvents.length > 0) {
      for (const ev of initialEvents) {
        if (!ev?.title) continue;
        const todayStr = new Date().toISOString().split("T")[0];
        const dateStr = ev.date || (ev.startTime ? ev.startTime.split("T")[0] : todayStr);
        const startTime = ev.startTime || `${dateStr}T09:00:00`;
        const endTime = ev.endTime || `${dateStr}T10:00:00`;
        const evId = crypto.randomUUID();
        const evRow = {
          id: evId,
          galaxyId: cometId,
          calendarId,
          memberId: hostMemberId,
          title: String(ev.title).trim(),
          description: ev.description ? String(ev.description) : null,
          location: ev.location ? String(ev.location) : null,
          startTime,
          endTime,
          isAllDay: Boolean(ev.isAllDay),
          rrule: ev.rrule || null,
          colorOverride: ev.colorOverride || creatorColor,
          createdByAgentId: mintedAgentId,
        };
        await db.insert(events).values(evRow);
        createdEvents.push(evRow);
      }
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      const expiryDateStr = expiresAt.split("T")[0];
      const welcomeEvent = {
        id: crypto.randomUUID(),
        galaxyId: cometId,
        calendarId,
        memberId: hostMemberId,
        title: `☄️ ${cometName} Launched`,
        description: `Ephemeral Comet calendar active until ${expiryDateStr}. Share code ${joinCode} to collaborate or export to .ics!`,
        startTime: `${todayStr}T09:00:00`,
        endTime: `${todayStr}T10:00:00`,
        isAllDay: true,
        colorOverride: creatorColor,
        createdByAgentId: mintedAgentId,
      };
      await db.insert(events).values(welcomeEvent);
      createdEvents.push(welcomeEvent);
    }

    // 6. Seed optional initial list items (todo / packing)
    const createdLists: any[] = [];
    if (Array.isArray(initialListItems) && initialListItems.length > 0) {
      for (const item of initialListItems) {
        const itemTitle =
          typeof item === "string" ? item.trim() : item?.title?.trim();
        if (!itemTitle) continue;
        const listRow = {
          id: `list_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
          galaxyId: cometId,
          listType: (item?.listType || "todo") as "todo" | "packing" | "grocery",
          title: itemTitle,
          isCompleted: false,
          addedByMemberId: hostMemberId,
          createdByAgentId: mintedAgentId,
        };
        await db.insert(listItems).values(listRow);
        createdLists.push(listRow);
      }
    }

    return NextResponse.json({
      success: true,
      comet: {
        id: cometId,
        name: cometName,
        slug,
        theme,
        icon,
        joinCode,
        familyColor: creatorColor,
        familyAvatar: "comet",
        isEphemeral: true,
        expiresAt,
        ttlDays,
        shareUrl: `/?comet=${joinCode}`,
        exportIcsUrl: `/api/events/export?galaxyId=${cometId}`,
        members: createdMembers,
        calendars: [
          {
            id: calendarId,
            galaxyId: cometId,
            name: "Comet Orbit",
            isPrimary: true,
            color: creatorColor,
          },
        ],
        events: createdEvents,
        lists: createdLists,
      },
      agentToken: mintedAgentToken,
    });
  } catch (error) {
    console.error("Failed to spin up Ephemeral Comet:", error);
    return NextResponse.json(
      { error: "Failed to spin up Ephemeral Comet" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();

    const actor = await resolveRequestActor(req);
    const session = await auth();
    let userId = session?.user?.id || null;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const body = await req.json();
    const {
      cometId: rawCometId,
      galaxyId: rawGalaxyId,
      action,
      targetGalaxyId,
      startDate,
      endDate,
      ttlDays,
    } = body;

    const cometId =
      rawCometId ||
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!cometId) {
      return NextResponse.json(
        { error: "cometId is required." },
        { status: 400 }
      );
    }

    const [comet] = await db
      .select()
      .from(galaxies)
      .where(eq(galaxies.id, cometId))
      .limit(1);

    if (!comet) {
      return NextResponse.json(
        { error: "Comet not found or has already spun down." },
        { status: 404 }
      );
    }

    // Action 1: Convert Ephemeral Comet into a Permanent Household Galaxy (OAuth required)
    if (action === "convert_to_galaxy") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "You must be signed in with Google to convert an ephemeral Comet into a permanent Galaxy.",
          },
          { status: 401 }
        );
      }

      const newJoinCode = comet.joinCode?.startsWith("CMT-")
        ? generateJoinCode()
        : comet.joinCode || generateJoinCode();

      await db
        .update(galaxies)
        .set({
          isEphemeral: false,
          expiresAt: null,
          ownerId: userId,
          joinCode: newJoinCode,
          familyAvatar:
            comet.familyAvatar === "comet" ? "planet" : comet.familyAvatar,
        })
        .where(eq(galaxies.id, cometId));

      // Link or add the signed-in user as owner member in galaxyMembers
      const members = await db
        .select()
        .from(galaxyMembers)
        .where(eq(galaxyMembers.galaxyId, cometId));

      const existingUserMember = members.find((m) => m.userId === userId);
      const unlinkedOwner = members.find(
        (m) => m.role === "owner" && !m.userId
      );

      if (existingUserMember) {
        await db
          .update(galaxyMembers)
          .set({ role: "owner" })
          .where(eq(galaxyMembers.id, existingUserMember.id));
      } else if (unlinkedOwner) {
        await db
          .update(galaxyMembers)
          .set({
            userId,
            displayName: session?.user?.name || unlinkedOwner.displayName,
            role: "owner",
          })
          .where(eq(galaxyMembers.id, unlinkedOwner.id));
      } else {
        await db.insert(galaxyMembers).values({
          id: crypto.randomUUID(),
          galaxyId: cometId,
          userId,
          displayName: session?.user?.name || "Galaxy Owner",
          role: "owner",
          color: "#8b5cf6",
          avatarIcon: "user",
        });
      }

      const [updatedGalaxy] = await db
        .select()
        .from(galaxies)
        .where(eq(galaxies.id, cometId))
        .limit(1);

      return NextResponse.json({
        success: true,
        converted: true,
        galaxy: updatedGalaxy,
      });
    }

    // Action 2: Copy / Export Comet events (within optional [startDate, endDate]) into an existing Galaxy
    if (action === "copy_to_galaxy" || action === "export_to_galaxy") {
      if (!targetGalaxyId) {
        return NextResponse.json(
          { error: "targetGalaxyId is required to copy events to a galaxy." },
          { status: 400 }
        );
      }

      const sourceAccess = await verifyActorGalaxyAccess(actor, cometId);
      if (!sourceAccess.allowed) {
        return NextResponse.json(
          { error: "You do not have access to the source Comet." },
          { status: 403 }
        );
      }

      const targetAccess = await verifyActorGalaxyAccess(
        actor,
        targetGalaxyId,
        { requireWrite: true }
      );
      if (!targetAccess.allowed) {
        return NextResponse.json(
          {
            error:
              targetAccess.error ||
              "You do not have write access to the destination Galaxy.",
          },
          { status: targetAccess.status || 403 }
        );
      }

      const sourceEvents = await db
        .select()
        .from(events)
        .where(eq(events.galaxyId, cometId));

      const filtered = filterEventsForTimeWindow(sourceEvents, {
        startDate,
        endDate,
        mode: "rrule",
      });

      // Find primary calendar of destination galaxy
      const destCalendars = await db
        .select()
        .from(calendars)
        .where(eq(calendars.galaxyId, targetGalaxyId));
      const destCalId = destCalendars[0]?.id || null;

      const copiedEvents: any[] = [];
      for (const evt of filtered) {
        const newEvt = {
          id: crypto.randomUUID(),
          galaxyId: targetGalaxyId,
          calendarId: destCalId,
          memberId: null,
          title: evt.title,
          description: evt.description
            ? `${evt.description} (Imported from ${comet.name})`
            : `Imported from ${comet.name}`,
          location: evt.location,
          startTime: evt.startTime,
          endTime: evt.endTime,
          isAllDay: Boolean(evt.isAllDay),
          rrule: evt.rrule || null,
          exdates: Array.isArray(evt.exdates)
            ? JSON.stringify(evt.exdates)
            : evt.exdates || null,
          colorOverride: evt.colorOverride || comet.familyColor,
          createdByAgentId: actor.kind === "agent" ? actor.agent.id : null,
        };
        await db.insert(events).values(newEvt);
        copiedEvents.push(newEvt);
      }

      return NextResponse.json({
        success: true,
        targetGalaxyId,
        copiedCount: copiedEvents.length,
        events: copiedEvents,
      });
    }

    // Action 3: Extend TTL
    if (action === "extend_ttl") {
      const access = await verifyActorGalaxyAccess(actor, cometId, {
        requireWrite: true,
      });
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error || "Forbidden" },
          { status: access.status || 403 }
        );
      }

      const days = typeof ttlDays === "number" && ttlDays > 0 ? ttlDays : 150;
      const newExpiresAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      await db
        .update(galaxies)
        .set({ expiresAt: newExpiresAt })
        .where(eq(galaxies.id, cometId));

      return NextResponse.json({
        success: true,
        cometId,
        expiresAt: newExpiresAt,
      });
    }

    return NextResponse.json(
      {
        error:
          "Unsupported action. Use 'convert_to_galaxy', 'copy_to_galaxy', or 'extend_ttl'.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update Comet:", error);
    return NextResponse.json(
      { error: "Failed to update Comet" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "purge_expired") {
      const purgedIds = await purgeExpiredComets();
      return NextResponse.json({
        success: true,
        purgedCount: purgedIds.length,
        purgedIds,
      });
    }

    let cometId =
      searchParams.get("id") ||
      searchParams.get("cometId") ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!cometId) {
      try {
        const body = await req.json();
        cometId = body.id || body.cometId;
      } catch {
        // No body
      }
    }

    if (!cometId) {
      return NextResponse.json(
        { error: "Comet id is required to spin down." },
        { status: 400 }
      );
    }

    const [target] = await db
      .select()
      .from(galaxies)
      .where(eq(galaxies.id, cometId))
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Comet not found or already spun down." },
        { status: 404 }
      );
    }

    if (!target.isEphemeral) {
      return NextResponse.json(
        {
          error:
            "Cannot spin down a permanent Household Galaxy via /api/comets.",
        },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, cometId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "Forbidden" },
        { status: access.status || 403 }
      );
    }

    // Delete all child rows and the Comet record itself
    await db.delete(events).where(eq(events.galaxyId, cometId));
    await db.delete(listItems).where(eq(listItems.galaxyId, cometId));
    await db.delete(agentKeys).where(eq(agentKeys.galaxyId, cometId));
    await db.delete(calendars).where(eq(calendars.galaxyId, cometId));
    await db.delete(galaxyMembers).where(eq(galaxyMembers.galaxyId, cometId));
    await db.delete(galaxies).where(eq(galaxies.id, cometId));

    return NextResponse.json({
      success: true,
      spunDownId: cometId,
    });
  } catch (error) {
    console.error("Failed to spin down Comet:", error);
    return NextResponse.json(
      { error: "Failed to spin down Comet" },
      { status: 500 }
    );
  }
}
