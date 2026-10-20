import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, galaxyMembers, listItems } from "@/db/schema";
import { asc, eq, and } from "drizzle-orm";
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

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to this galaxy's meal plans." },
        { status: access.status || 403 }
      );
    }

    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, galaxyId));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const meals = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.galaxyId, galaxyId))
      .orderBy(asc(mealPlans.planDate));

    const agentMap = await getGalaxyAgentMap(galaxyId);

    const enrichedMeals = meals.map((meal) => {
      const member = meal.memberId ? memberMap.get(meal.memberId) : null;
      return {
        id: meal.id,
        planDate: meal.planDate,
        mealType: meal.mealType,
        title: meal.title,
        notes: meal.notes,
        recipeUrl: meal.recipeUrl,
        memberId: meal.memberId,
        memberName: member?.displayName,
        memberColor: member?.color,
        createdByAgentId: meal.createdByAgentId,
        agent: meal.createdByAgentId ? agentMap.get(meal.createdByAgentId) || null : null,
      };
    });

    const mappedMembers = members.map((m) => ({
      id: m.id,
      name: m.displayName,
      color: m.color,
    }));

    return NextResponse.json({ meals: enrichedMeals, members: mappedMembers });
  } catch (error) {
    console.error("Failed to fetch meals:", error);
    return NextResponse.json(
      { error: "Failed to fetch meals" },
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
      action,
      title,
      planDate,
      mealType = "dinner",
      memberId: rawMemberId,
      notes,
      recipeUrl,
      galaxyId: rawGalaxyId,
    } = body;

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to modify meals in this galaxy." },
        { status: access.status || 403 }
      );
    }

    const memberId =
      rawMemberId !== undefined
        ? rawMemberId
        : actor.kind === "agent"
        ? actor.agent.memberId
        : null;

    const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

    // Direct action: Add ingredients to grocery list
    if (action === "add-to-grocery") {
      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const listItemId = `list_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      await db.insert(listItems).values({
        id: listItemId,
        galaxyId,
        listType: "grocery",
        title: `Ingredients: ${title}`,
        isCompleted: false,
        addedByMemberId: memberId || null,
        createdByAgentId,
      });

      if (actor.kind === "agent") {
        await recordAgentAction(actor.agent.id);
      }

      return NextResponse.json({ success: true, addedToGrocery: true });
    }

    if (!title || !planDate) {
      return NextResponse.json(
        { error: "title and planDate are required" },
        { status: 400 }
      );
    }

    const mealId = `meal_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    await db.insert(mealPlans).values({
      id: mealId,
      galaxyId,
      planDate,
      mealType,
      title: title.trim(),
      memberId: memberId || null,
      notes: notes || null,
      recipeUrl: recipeUrl || null,
      createdByAgentId,
    });

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      success: true,
      id: mealId,
      createdByAgentId,
      agent: actor.kind === "agent" ? actor.agent : null,
    });
  } catch (error) {
    console.error("Failed to save meal plan:", error);
    return NextResponse.json(
      { error: "Failed to save meal plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const body = await request.json();
    const { id, title, planDate, mealType, notes, recipeUrl, memberId } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, existing.galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to edit this meal plan." },
        { status: access.status || 403 }
      );
    }

    const updates: Partial<typeof mealPlans.$inferInsert> = {};
    if (title) updates.title = title.trim();
    if (planDate) updates.planDate = planDate;
    if (mealType) updates.mealType = mealType;
    if (notes !== undefined) updates.notes = notes || null;
    if (recipeUrl !== undefined) updates.recipeUrl = recipeUrl || null;
    if (memberId !== undefined) updates.memberId = memberId || null;

    if (actor.kind === "agent") {
      updates.createdByAgentId = actor.agent.id;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(mealPlans).set(updates).where(eq(mealPlans.id, id));
    }

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true, updated: updates });
  } catch (error) {
    console.error("Failed to update meal plan:", error);
    return NextResponse.json(
      { error: "Failed to update meal plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, existing.galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to delete this meal plan." },
        { status: access.status || 403 }
      );
    }

    await db.delete(mealPlans).where(eq(mealPlans.id, id));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Failed to delete meal plan:", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}
