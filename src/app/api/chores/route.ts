import { NextResponse } from "next/server";
import { db } from "@/db";
import { chores, choreCompletions, galaxyMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const galaxyId = searchParams.get("galaxyId") || "galaxy_sol_family";
    const dateParam =
      searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const memberId = searchParams.get("memberId");

    const session = await auth();
    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this galaxy's chores." },
        { status: 403 }
      );
    }

    // Fetch members of this galaxy
    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, galaxyId));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Fetch chores for this galaxy
    let allChores = await db
      .select()
      .from(chores)
      .where(and(eq(chores.galaxyId, galaxyId), eq(chores.isActive, true)));

    if (memberId && memberId !== "all") {
      allChores = allChores.filter((c) => c.memberId === memberId);
    }

    // Fetch completions for the requested date
    const completions = await db
      .select()
      .from(choreCompletions)
      .where(eq(choreCompletions.completedDate, dateParam));

    const completedChoreIds = new Set(completions.map((c) => c.choreId));

    const choreItems = allChores.map((chore) => {
      const member = memberMap.get(chore.memberId);
      return {
        id: chore.id,
        memberId: chore.memberId,
        memberName: member?.displayName || "Family Member",
        memberColor: member?.color || "#8b5cf6",
        title: chore.title,
        points: chore.points,
        completed: completedChoreIds.has(chore.id),
        frequency:
          chore.recurrenceType === "daily" ? "Daily Routine" : "Weekly Routine",
        dueTime: chore.dueTime || undefined,
      };
    });

    const starBalances = members.reduce<Record<string, number>>((acc, m) => {
      acc[m.displayName] = m.starBalance;
      return acc;
    }, {});

    const mappedMembers = members.map((m) => ({
      id: m.id,
      name: m.displayName,
      color: m.color,
      starBalance: m.starBalance,
    }));

    return NextResponse.json({
      chores: choreItems,
      starBalances,
      members: mappedMembers,
    });
  } catch (error) {
    console.error("Failed to fetch chores:", error);
    return NextResponse.json(
      { error: "Failed to fetch chores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const {
      memberId,
      title,
      points = 1,
      recurrenceType = "daily",
      dueTime,
      galaxyId = "galaxy_sol_family",
    } = body;

    if (!memberId || !title) {
      return NextResponse.json(
        { error: "memberId and title are required" },
        { status: 400 }
      );
    }

    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to add chores in this galaxy." },
        { status: 403 }
      );
    }

    const choreId = `chore_${Date.now()}`;
    await db.insert(chores).values({
      id: choreId,
      galaxyId,
      memberId,
      title: title.trim(),
      points: Number(points) || 1,
      recurrenceType,
      dueTime: dueTime || null,
      isActive: true,
    });

    return NextResponse.json({ success: true, id: choreId });
  } catch (error) {
    console.error("Failed to create chore:", error);
    return NextResponse.json(
      { error: "Failed to create chore" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const { choreId, date } = body;
    const completedDate = date || new Date().toISOString().slice(0, 10);

    if (!choreId) {
      return NextResponse.json(
        { error: "choreId is required" },
        { status: 400 }
      );
    }

    // Find chore to get points, memberId, and galaxyId
    const [chore] = await db
      .select()
      .from(chores)
      .where(eq(chores.id, choreId))
      .limit(1);
    if (!chore) {
      return NextResponse.json({ error: "Chore not found" }, { status: 404 });
    }

    const hasAccess = await verifyGalaxyAccess(
      chore.galaxyId,
      session?.user?.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to modify this chore." },
        { status: 403 }
      );
    }

    // Check existing completion
    const [existing] = await db
      .select()
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.choreId, choreId),
          eq(choreCompletions.completedDate, completedDate)
        )
      )
      .limit(1);

    let completed = false;
    const pointsDelta = chore.points;

    if (existing) {
      // Uncheck chore
      await db
        .delete(choreCompletions)
        .where(eq(choreCompletions.id, existing.id));

      await db
        .update(galaxyMembers)
        .set({
          starBalance: sql`MAX(0, ${galaxyMembers.starBalance} - ${pointsDelta})`,
        })
        .where(eq(galaxyMembers.id, chore.memberId));

      completed = false;
    } else {
      // Check chore
      await db.insert(choreCompletions).values({
        id: `comp_${Date.now()}`,
        choreId: chore.id,
        memberId: chore.memberId,
        completedDate,
        pointsAwarded: pointsDelta,
      });

      await db
        .update(galaxyMembers)
        .set({
          starBalance: sql`${galaxyMembers.starBalance} + ${pointsDelta}`,
        })
        .where(eq(galaxyMembers.id, chore.memberId));

      completed = true;
    }

    // Return updated member star balances for this galaxy
    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, chore.galaxyId));
    const starBalances = members.reduce<Record<string, number>>((acc, m) => {
      acc[m.displayName] = m.starBalance;
      return acc;
    }, {});

    return NextResponse.json({ success: true, completed, starBalances });
  } catch (error) {
    console.error("Failed to toggle chore completion:", error);
    return NextResponse.json(
      { error: "Failed to toggle chore completion" },
      { status: 500 }
    );
  }
}
