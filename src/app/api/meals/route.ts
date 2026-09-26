import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, galaxyMembers, listItems } from "@/db/schema";
import { asc, eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const galaxyId = searchParams.get("galaxyId") || "galaxy_sol_family";

    const session = await auth();
    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this galaxy's meal plans." },
        { status: 403 }
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
    const session = await auth();
    const body = await request.json();
    const {
      action,
      title,
      planDate,
      mealType = "dinner",
      memberId,
      notes,
      galaxyId = "galaxy_sol_family",
    } = body;

    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to modify meals in this galaxy." },
        { status: 403 }
      );
    }

    // Direct action: Add ingredients to grocery list
    if (action === "add-to-grocery") {
      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const listItemId = `list_${Date.now()}`;
      await db.insert(listItems).values({
        id: listItemId,
        galaxyId,
        listType: "grocery",
        title: `Ingredients: ${title}`,
        isCompleted: false,
        addedByMemberId: memberId || null,
      });

      return NextResponse.json({ success: true, addedToGrocery: true });
    }

    if (!title || !planDate) {
      return NextResponse.json(
        { error: "title and planDate are required" },
        { status: 400 }
      );
    }

    const mealId = `meal_${Date.now()}`;
    await db.insert(mealPlans).values({
      id: mealId,
      galaxyId,
      planDate,
      mealType,
      title: title.trim(),
      memberId: memberId || null,
      notes: notes || null,
    });

    return NextResponse.json({ success: true, id: mealId });
  } catch (error) {
    console.error("Failed to save meal plan:", error);
    return NextResponse.json(
      { error: "Failed to save meal plan" },
      { status: 500 }
    );
  }
}
