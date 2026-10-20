import { NextResponse } from "next/server";
import { db } from "@/db";
import { listItems, galaxyMembers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
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

    const listType = (searchParams.get("type") || "grocery") as
      | "grocery"
      | "todo"
      | "packing";
    const memberId = searchParams.get("memberId");

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to this galaxy's lists." },
        { status: access.status || 403 }
      );
    }

    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, galaxyId));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    let query = await db
      .select()
      .from(listItems)
      .where(
        and(
          eq(listItems.galaxyId, galaxyId),
          eq(listItems.listType, listType)
        )
      )
      .orderBy(desc(listItems.createdAt));

    if (memberId && memberId !== "all") {
      query = query.filter((item) => item.addedByMemberId === memberId);
    }

    const agentMap = await getGalaxyAgentMap(galaxyId);

    const items = query.map((item) => {
      const member = item.addedByMemberId
        ? memberMap.get(item.addedByMemberId)
        : null;
      return {
        id: item.id,
        title: item.title,
        completed: item.isCompleted,
        category: "General",
        addedByMemberId: item.addedByMemberId,
        addedByName: member?.displayName,
        addedByColor: member?.color,
        createdByAgentId: item.createdByAgentId,
        agent: item.createdByAgentId ? agentMap.get(item.createdByAgentId) || null : null,
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
    return NextResponse.json(
      { error: "Failed to fetch list items" },
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
      title,
      addedByMemberId: rawAddedByMemberId,
      listType = "grocery",
      galaxyId: rawGalaxyId,
    } = body;

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to add items in this galaxy." },
        { status: access.status || 403 }
      );
    }

    // Default addedByMemberId to bound Inhabitant if agent omitted it
    const addedByMemberId =
      rawAddedByMemberId !== undefined
        ? rawAddedByMemberId
        : actor.kind === "agent"
        ? actor.agent.memberId
        : null;

    // Millisecond collision prevention
    const id = `list_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

    await db.insert(listItems).values({
      id,
      galaxyId,
      listType,
      title: title.trim(),
      isCompleted: false,
      addedByMemberId: addedByMemberId || null,
      createdByAgentId,
    });

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      success: true,
      id,
      createdByAgentId,
      agent: actor.kind === "agent" ? actor.agent : null,
    });
  } catch (error) {
    console.error("Failed to create list item:", error);
    return NextResponse.json(
      { error: "Failed to create list item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Item id is required" },
        { status: 400 }
      );
    }

    const [item] = await db
      .select()
      .from(listItems)
      .where(eq(listItems.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, item.galaxyId, { requireWrite: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to update this item." },
        { status: access.status || 403 }
      );
    }

    await db
      .update(listItems)
      .set({ isCompleted: completed })
      .where(eq(listItems.id, id));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update list item:", error);
    return NextResponse.json(
      { error: "Failed to update list item" },
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
    const action = searchParams.get("action");
    const rawGalaxyId = searchParams.get("galaxyId");

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (action === "clear-completed") {
      if (!galaxyId) {
        return NextResponse.json(
          { error: "galaxyId is required to clear completed items" },
          { status: 400 }
        );
      }
      const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error || "You do not have permission for this galaxy." },
          { status: access.status || 403 }
        );
      }
      await db
        .delete(listItems)
        .where(
          and(
            eq(listItems.galaxyId, galaxyId),
            eq(listItems.isCompleted, true)
          )
        );

      if (actor.kind === "agent") {
        await recordAgentAction(actor.agent.id);
      }

      return NextResponse.json({ success: true, cleared: true });
    }

    if (id) {
      const [item] = await db
        .select()
        .from(listItems)
        .where(eq(listItems.id, id))
        .limit(1);

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const access = await verifyActorGalaxyAccess(actor, item.galaxyId, { requireWrite: true });
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error || "You do not have permission to delete this item." },
          { status: access.status || 403 }
        );
      }

      await db.delete(listItems).where(eq(listItems.id, id));

      if (actor.kind === "agent") {
        await recordAgentAction(actor.agent.id);
      }

      return NextResponse.json({ success: true, deleted: id });
    }

    return NextResponse.json(
      { error: "id or action is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to delete list item:", error);
    return NextResponse.json(
      { error: "Failed to delete list item" },
      { status: 500 }
    );
  }
}
