import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import {
  galaxies,
  galaxyMembers,
  calendars,
  events,
  generateJoinCode,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { ensureDbUser } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("demo") === "true";

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

      // 2. If logged in user has no galaxies yet, auto-provision their personal default galaxy
      if (userGalaxies.length === 0) {
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
        userGalaxies = freshGalaxy;
      }
    } else if (isDemo) {
      // For unauthenticated sandbox demo mode, return ONLY the demo Sol Family Galaxy
      const demoGalaxies = await db
        .select()
        .from(galaxies)
        .where(eq(galaxies.id, "galaxy_sol_family"));
      userGalaxies = demoGalaxies;
    } else {
      // Unauthenticated non-demo requests receive empty list (strict privacy)
      return NextResponse.json({ galaxies: [] });
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
    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const body = await req.json();
    const { galaxyId, name, familyColor, familyAvatar, theme, icon } = body;

    if (!galaxyId) {
      return NextResponse.json({ error: "galaxyId is required" }, { status: 400 });
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
