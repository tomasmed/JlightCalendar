import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabaseSchema, purgeExpiredComets } from "@/db/ensure-schema";
import {
  galaxies,
  galaxyMembers,
  calendars,
  events,
  generateJoinCode,
  normalizeJoinCode,
} from "@/db/schema";
import { auth } from "@/auth";
import { ensureDbUser } from "@/lib/auth-helpers";
import { resolveRequestActor, verifyActorGalaxyAccess, recordAgentAction } from "@/lib/agent-auth";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();
    const actor = await resolveRequestActor(req);

    if (actor.kind === "invalid_agent") {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    if (actor.kind === "agent") {
      // Agent actor: Return its bound galaxy with members and calendars
      const [boundGalaxy] = await db
        .select()
        .from(galaxies)
        .where(eq(galaxies.id, actor.agent.galaxyId))
        .limit(1);

      if (!boundGalaxy) {
        return NextResponse.json({ error: "Galaxy not found" }, { status: 404 });
      }

      const members = await db
        .select()
        .from(galaxyMembers)
        .where(eq(galaxyMembers.galaxyId, boundGalaxy.id));

      const calList = await db
        .select()
        .from(calendars)
        .where(eq(calendars.galaxyId, boundGalaxy.id));

      await recordAgentAction(actor.agent.id);

      return NextResponse.json({
        galaxies: [
          {
            ...boundGalaxy,
            members,
            calendars: calList,
          },
        ],
      });
    }

    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("demo") === "true";
    const cometParam = searchParams.get("comet");

    let userGalaxies: (typeof galaxies.$inferSelect)[] = [];

    if (userId) {
      // 1. Fetch galaxies where user is an inhabitant/member
      const memberships = await db
        .select({
          galaxyId: galaxyMembers.galaxyId,
        })
        .from(galaxyMembers)
        .where(eq(galaxyMembers.userId, userId));

      const memberGalaxyIds = new Set(memberships.map((m) => m.galaxyId));

      const allGalaxies = await db.select().from(galaxies);
      userGalaxies = allGalaxies.filter(
        (g) => g.ownerId === userId || memberGalaxyIds.has(g.id)
      );

      // 2. If logged in user has no permanent galaxies yet, auto-provision their personal default galaxy
      if (!userGalaxies.some((g) => !g.isEphemeral)) {
        const galaxyId = crypto.randomUUID();
        const userName = session?.user?.name;
        const galaxyName = userName
          ? `${userName}'s Family Galaxy`
          : "My Family Galaxy";
        const joinCode = generateJoinCode();

        await db.insert(galaxies).values({
          id: galaxyId,
          name: galaxyName,
          theme: "milky-way",
          icon: "sparkles",
          ownerId: userId,
          parentPin: "1234",
          joinCode,
        });

        const memberId = crypto.randomUUID();
        await db.insert(galaxyMembers).values({
          id: memberId,
          galaxyId,
          userId,
          displayName: session?.user?.name || "Owner",
          role: "owner",
          color: "#8b5cf6",
          avatarIcon: "user",
        });

        const calendarId = crypto.randomUUID();
        await db.insert(calendars).values({
          id: calendarId,
          galaxyId,
          name: "Primary Orbit",
          isPrimary: true,
          color: "#8b5cf6",
        });

        // 4. Create the welcoming creation event!
        const todayStr = new Date().toISOString().split("T")[0];
        await db.insert(events).values({
          id: crypto.randomUUID(),
          galaxyId,
          calendarId,
          memberId,
          title: "Date of Jlight galaxy creation",
          description: `Welcome to ${galaxyName}! Orbit established on ${todayStr}.`,
          startTime: `${todayStr}T09:00:00`,
          endTime: `${todayStr}T10:00:00`,
          isAllDay: true,
          colorOverride: "#8b5cf6",
        });

        const freshGalaxy = await db
          .select()
          .from(galaxies)
          .where(eq(galaxies.id, galaxyId));
        userGalaxies = [...freshGalaxy, ...userGalaxies];
      }
    } else if (isDemo) {
      // For unauthenticated sandbox demo mode, return ONLY the demo Sol Family Galaxy
      const demoGalaxies = await db
        .select()
        .from(galaxies)
        .where(eq(galaxies.id, "galaxy_sol_family"));
      userGalaxies = demoGalaxies;
    } else if (!cometParam) {
      // Unauthenticated non-demo, non-comet requests receive empty list (strict privacy)
      return NextResponse.json({ galaxies: [] });
    }

    // If a specific Ephemeral Comet was requested via ?comet=..., include it if active
    if (cometParam && cometParam.trim()) {
      const rawComet = cometParam.trim();
      const normCode = normalizeJoinCode(rawComet);
      const matchedComets = await db
        .select()
        .from(galaxies)
        .where(
          or(
            eq(galaxies.id, rawComet),
            eq(galaxies.joinCode, normCode),
            eq(galaxies.joinCode, rawComet.toUpperCase()),
            eq(galaxies.slug, rawComet.toLowerCase())
          )
        )
        .limit(1);

      if (
        matchedComets.length > 0 &&
        matchedComets[0].isEphemeral &&
        (!matchedComets[0].expiresAt ||
          new Date(matchedComets[0].expiresAt).getTime() > Date.now())
      ) {
        if (!userGalaxies.some((g) => g.id === matchedComets[0].id)) {
          userGalaxies = [matchedComets[0], ...userGalaxies];
        }
      }
    }

    // Enrich each galaxy with its inhabitants and calendars
    const results = await Promise.all(
      userGalaxies.map(async (galaxy) => {
        // Ensure galaxy has a joinCode; if legacy without one, populate it
        let currentJoinCode = galaxy.joinCode;
        if (!currentJoinCode) {
          currentJoinCode = generateJoinCode();
          try {
            await db
              .update(galaxies)
              .set({ joinCode: currentJoinCode })
              .where(eq(galaxies.id, galaxy.id));
          } catch (e) {
            // Ignore error if concurrent
          }
        }

        const members = await db
          .select()
          .from(galaxyMembers)
          .where(eq(galaxyMembers.galaxyId, galaxy.id));

        const galaxyCalendars = await db
          .select()
          .from(calendars)
          .where(eq(calendars.galaxyId, galaxy.id));

        return {
          ...galaxy,
          joinCode: currentJoinCode,
          members,
          calendars: galaxyCalendars,
        };
      })
    );

    return NextResponse.json({ galaxies: results });
  } catch (error) {
    console.error("Failed to fetch galaxies:", error);
    return NextResponse.json(
      { error: "Failed to fetch galaxies" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    if (actor.kind === "agent") {
      return NextResponse.json(
        { error: "Forbidden: Agents cannot create new galaxies. Only human operators can provision galaxies." },
        { status: 403 }
      );
    }

    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to create a galaxy." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, theme = "milky-way", icon = "sparkles" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const galaxyId = crypto.randomUUID();
    const joinCode = generateJoinCode();
    const galaxyName = name.trim();

    // 1. Create Galaxy
    await db.insert(galaxies).values({
      id: galaxyId,
      name: galaxyName,
      theme,
      icon,
      ownerId: userId,
      parentPin: "1234",
      joinCode,
    });

    // 2. Add creator as owner member
    const memberId = crypto.randomUUID();
    await db.insert(galaxyMembers).values({
      id: memberId,
      galaxyId,
      userId,
      displayName: session?.user?.name || "Captain",
      role: "owner",
      color: "#8b5cf6",
      avatarIcon: "user",
    });

    // 3. Create default primary calendar
    const calendarId = crypto.randomUUID();
    await db.insert(calendars).values({
      id: calendarId,
      galaxyId,
      name: "Primary Orbit",
      isPrimary: true,
      color: "#8b5cf6",
    });

    // 4. Create the creation event!
    const todayStr = new Date().toISOString().split("T")[0];
    await db.insert(events).values({
      id: crypto.randomUUID(),
      galaxyId,
      calendarId,
      memberId,
      title: "Date of Jlight galaxy creation",
      description: `Welcome to ${galaxyName}! Orbit established on ${todayStr}.`,
      startTime: `${todayStr}T09:00:00`,
      endTime: `${todayStr}T10:00:00`,
      isAllDay: true,
      colorOverride: "#8b5cf6",
    });

    return NextResponse.json({
      success: true,
      galaxy: {
        id: galaxyId,
        name,
        theme,
        icon,
        joinCode,
        members: [
          {
            id: memberId,
            galaxyId,
            displayName: session?.user?.name || "Captain",
            role: "owner",
            color: "#8b5cf6",
            avatarIcon: "user",
          },
        ],
        calendars: [
          {
            id: calendarId,
            galaxyId,
            name: "Primary Orbit",
            isPrimary: true,
            color: "#8b5cf6",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Failed to create galaxy:", error);
    return NextResponse.json(
      { error: "Failed to create galaxy" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const body = await req.json();
    const { galaxyId: rawGalaxyId, id: rawId, name, familyColor, familyAvatar, theme, icon } = body;
    const galaxyId = rawGalaxyId || rawId || (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!galaxyId) {
      return NextResponse.json({ error: "galaxyId is required" }, { status: 400 });
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireAdmin: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to update this galaxy." },
        { status: access.status || 403 }
      );
    }

    const updates: Record<string, any> = {};
    if (name) updates.name = name.trim();
    if (familyColor) updates.familyColor = familyColor;
    if (familyAvatar) updates.familyAvatar = familyAvatar;
    if (theme) updates.theme = theme;
    if (icon) updates.icon = icon;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.update(galaxies).set(updates).where(eq(galaxies.id, galaxyId));

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Failed to update galaxy:", error);
    return NextResponse.json(
      { error: "Failed to update galaxy" },
      { status: 500 }
    );
  }
}
