import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealPlans, familyMembers, listItems } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const members = await db.select().from(familyMembers);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const meals = await db
      .select()
      .from(mealPlans)
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
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, title, planDate, mealType = "dinner", memberId, notes, galaxyId } = body;

    // Direct action: Add ingredients to grocery list
    if (action === "add-to-grocery") {
      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }

      const listItemId = `list_${Date.now()}`;
      await db.insert(listItems).values({
        id: listItemId,
        galaxyId: galaxyId || "galaxy_sol_family",
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
      galaxyId: galaxyId || "galaxy_sol_family",
      planDate,
      mealType,
      title: title.trim(),
      memberId: memberId || null,
      notes: notes || null,
    });

    return NextResponse.json({ success: true, id: mealId });
  } catch (error) {
    console.error("Failed to save meal plan:", error);
    return NextResponse.json({ error: "Failed to save meal plan" }, { status: 500 });
  }
}
