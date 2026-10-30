import { NextResponse } from "next/server";
import { db } from "@/db";
import { galaxyMembers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);
    const rawGalaxyId = searchParams.get("galaxyId");

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!galaxyId) {
      return NextResponse.json(
        { error: "galaxyId is required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You do not have access to view this galaxy's members.",
        },
        { status: access.status || 403 }
      );
    }

    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, galaxyId))
      .orderBy(asc(galaxyMembers.createdAt));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    const mapped = members.map((m) => ({
      id: m.id,
      galaxyId: m.galaxyId,
      name: m.displayName,
      displayName: m.displayName,
      color: m.color,
      avatarIcon: m.avatarIcon,
      role: m.role,
      starBalance: m.starBalance,
    }));

    return NextResponse.json({ members: mapped });
  } catch (error) {
    console.error("Failed to fetch family members:", error);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
