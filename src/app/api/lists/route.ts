import { NextResponse } from "next/server";
import { db } from "@/db";
import { listItems, familyMembers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listType = (searchParams.get("type") || "grocery") as "grocery" | "todo" | "packing";
    const memberId = searchParams.get("memberId");

    const members = await db.select().from(familyMembers);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    let query = await db
      .select()
      .from(listItems)
      .where(eq(listItems.listType, listType))
      .orderBy(desc(listItems.createdAt));

    if (memberId && memberId !== "all") {
      query = query.filter((item) => item.addedByMemberId === memberId);
    }

    const items = query.map((item) => {
      const member = item.addedByMemberId ? memberMap.get(item.addedByMemberId) : null;
      return {
        id: item.id,
        title: item.title,
        completed: item.isCompleted,
        category: "General",
        addedByMemberId: item.addedByMemberId,
        addedByName: member?.displayName,
        addedByColor: member?.color,
      };
    });

    const mappedMembers = members.map((m) => ({
      id: m.id,
      name: m.displayName,
      color: m.color,
    }));

    return NextResponse.json({ items, members: mappedMembers });
  } catch (error) {
    console.error("Failed to fetch list items:", error);
    return NextResponse.json({ error: "Failed to fetch list items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, addedByMemberId, listType = "grocery", galaxyId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const id = `list_${Date.now()}`;
    await db.insert(listItems).values({
      id,
      galaxyId: galaxyId || "galaxy_sol_family",
      listType,
      title: title.trim(),
      isCompleted: false,
      addedByMemberId: addedByMemberId || null,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create list item:", error);
    return NextResponse.json({ error: "Failed to create list item" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    }

    await db
      .update(listItems)
      .set({ isCompleted: completed })
      .where(eq(listItems.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update list item:", error);
    return NextResponse.json({ error: "Failed to update list item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (action === "clear-completed") {
      await db.delete(listItems).where(eq(listItems.isCompleted, true));
      return NextResponse.json({ success: true, cleared: true });
    }

    if (id) {
      await db.delete(listItems).where(eq(listItems.id, id));
      return NextResponse.json({ success: true, deleted: id });
    }

    return NextResponse.json({ error: "id or action is required" }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete list item:", error);
    return NextResponse.json({ error: "Failed to delete list item" }, { status: 500 });
  }
}
