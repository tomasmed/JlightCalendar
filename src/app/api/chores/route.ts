import { NextResponse } from "next/server";
import { db } from "@/db";
import { chores, choreCompletions, galaxyMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
  getGalaxyAgentMap,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const { searchParams } = new URL(request.url);
    const rawGalaxyId = searchParams.get("galaxyId");

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    const dateParam =
      searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const memberId = searchParams.get("memberId");

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to this galaxy's chores." },
        { status: access.status || 403 }
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
    const dateCompletions = await db
      .select()
      .from(choreCompletions)
      .where(eq(choreCompletions.completedDate, dateParam));

    const completedChoreIds = new Set(dateCompletions.map((c) => c.choreId));

    // Also fetch completions for any one_time chore across all dates
    const oneTimeChoreIds = allChores
      .filter((c) => c.recurrenceType === "one_time")
      .map((c) => c.id);

    if (oneTimeChoreIds.length > 0) {
      const allCompletions = await db
        .select({ choreId: choreCompletions.choreId })
        .from(choreCompletions);
      for (const comp of allCompletions) {
        if (oneTimeChoreIds.includes(comp.choreId)) {
          completedChoreIds.add(comp.choreId);
        }
      }
    }

    const agentMap = await getGalaxyAgentMap(galaxyId);

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
          chore.recurrenceType === "one_time"
            ? "One-Time Task"
            : chore.recurrenceType === "biweekly"
            ? "Biweekly Routine"
            : chore.recurrenceType === "weekly"
            ? "Weekly Routine"
            : "Daily Routine",
        recurrenceType: chore.recurrenceType,
        dueTime: chore.dueTime || undefined,
        createdByAgentId: chore.createdByAgentId,
        agent: chore.createdByAgentId ? agentMap.get(chore.createdByAgentId) || null : null,
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
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const body = await request.json();
    const {
      memberId: rawMemberId,
      title,
      points = 1,
      recurrenceType = "daily",
      dueTime,
      galaxyId: rawGalaxyId,
    } = body;

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    // Default memberId for agent
    const memberId =
      rawMemberId ||
      (actor.kind === "agent" ? actor.agent.memberId : null);

    if (!memberId || !title) {
      return NextResponse.json(
        { error: "memberId and title are required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to add chores in this galaxy." },
        { status: access.status || 403 }
      );
    }

    const choreId = `chore_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

    await db.insert(chores).values({
      id: choreId,
      galaxyId,
      memberId,
      title: title.trim(),
      points: Number(points) || 1,
      recurrenceType,
      dueTime: dueTime || null,
      isActive: true,
      createdByAgentId,
    });

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      success: true,
      id: choreId,
      createdByAgentId,
      agent: actor.kind === "agent" ? actor.agent : null,
    });
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
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
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

    // Kid-scoped agents ARE allowed to toggle chore completions! (allowKidWrite: true)
    const access = await verifyActorGalaxyAccess(actor, chore.galaxyId, {
      requireWrite: true,
      allowKidWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to modify this chore." },
        { status: access.status || 403 }
      );
    }

    // Check existing completion (for one_time chores, check any date)
    const [existing] =
      chore.recurrenceType === "one_time"
        ? await db
            .select()
            .from(choreCompletions)
            .where(eq(choreCompletions.choreId, choreId))
            .limit(1)
        : await db
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
      const compId = `comp_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

      await db.insert(choreCompletions).values({
        id: compId,
        choreId: chore.id,
        memberId: chore.memberId,
        completedDate,
        pointsAwarded: pointsDelta,
        createdByAgentId,
      });

      await db
        .update(galaxyMembers)
        .set({
          starBalance: sql`${galaxyMembers.starBalance} + ${pointsDelta}`,
        })
        .where(eq(galaxyMembers.id, chore.memberId));

      completed = true;
    }

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
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

export async function DELETE(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const { searchParams } = new URL(request.url);
    const choreId = searchParams.get("choreId");

    if (!choreId) {
      return NextResponse.json(
        { error: "choreId is required" },
        { status: 400 }
      );
    }

    const [chore] = await db
      .select()
      .from(chores)
      .where(eq(chores.id, choreId))
      .limit(1);

    if (!chore) {
      return NextResponse.json({ error: "Chore not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, chore.galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to delete this chore." },
        { status: access.status || 403 }
      );
    }

    // Delete completions first
    await db
      .delete(choreCompletions)
      .where(eq(choreCompletions.choreId, choreId));

    // Delete chore
    await db.delete(chores).where(eq(chores.id, choreId));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true, deletedChoreId: choreId });
  } catch (error) {
    console.error("Failed to delete chore:", error);
    return NextResponse.json(
      { error: "Failed to delete chore" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const body = await request.json();
    const {
      choreId,
      title,
      memberId,
      points,
      recurrenceType,
      dueTime,
    } = body;

    if (!choreId || !title || !memberId) {
      return NextResponse.json(
        { error: "choreId, title, and memberId are required" },
        { status: 400 }
      );
    }

    const [chore] = await db
      .select()
      .from(chores)
      .where(eq(chores.id, choreId))
      .limit(1);

    if (!chore) {
      return NextResponse.json({ error: "Chore not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, chore.galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to edit this chore." },
        { status: access.status || 403 }
      );
    }

    await db
      .update(chores)
      .set({
        title: title.trim(),
        memberId,
        points: Number(points) || 1,
        recurrenceType: recurrenceType || "daily",
        dueTime: dueTime || null,
      })
      .where(eq(chores.id, choreId));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true, choreId });
  } catch (error) {
    console.error("Failed to update chore:", error);
    return NextResponse.json(
      { error: "Failed to update chore" },
      { status: 500 }
    );
  }
}
