import { NextResponse } from "next/server";
import { db } from "@/db";
import { galaxies, galaxyMembers, calendars } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    let userGalaxies: (typeof galaxies.$inferSelect)[] = [];

    if (userId) {
      // Fetch galaxies where user is an inhabitant/member or owner
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
    }

    // If no user or kiosk/demo fallback, return all galaxies
    if (userGalaxies.length === 0) {
      userGalaxies = await db.select().from(galaxies);
    }

    // Enrich each galaxy with its inhabitants and calendars
    const results = await Promise.all(
      userGalaxies.map(async (galaxy) => {
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
    const session = await auth();
    const body = await req.json();
    const { name, theme = "milky-way", icon = "sparkles" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const galaxyId = crypto.randomUUID();
    const ownerId = session?.user?.id || null;

    // 1. Create Galaxy
    await db.insert(galaxies).values({
      id: galaxyId,
      name,
      theme,
      icon,
      ownerId,
      parentPin: "1234",
    });

    // 2. Add creator as owner member
    const memberId = crypto.randomUUID();
    await db.insert(galaxyMembers).values({
      id: memberId,
      galaxyId,
      userId: ownerId,
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

    return NextResponse.json({
      success: true,
      galaxy: {
        id: galaxyId,
        name,
        theme,
        icon,
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
