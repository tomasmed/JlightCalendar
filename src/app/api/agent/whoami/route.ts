import { NextResponse } from "next/server";
import { db } from "@/db";
import { galaxies, galaxyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveRequestActor, recordAgentAction } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await resolveRequestActor(req);

  if (actor.kind === "invalid_agent") {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  if (actor.kind !== "agent") {
    return NextResponse.json(
      {
        error:
          "This orientation endpoint is intended for autonomous agents authenticated with Bearer jlight_ag_... tokens.",
      },
      { status: 401 }
    );
  }

  // Telemetry: increment action count
  await recordAgentAction(actor.agent.id);

  // Fetch galaxy details
  const galaxyRows = await db
    .select()
    .from(galaxies)
    .where(eq(galaxies.id, actor.agent.galaxyId))
    .limit(1);

  const galaxy = galaxyRows[0] || null;

  // Fetch all inhabitants in this galaxy
  const members = await db
    .select({
      id: galaxyMembers.id,
      displayName: galaxyMembers.displayName,
      role: galaxyMembers.role,
      color: galaxyMembers.color,
      avatarIcon: galaxyMembers.avatarIcon,
      starBalance: galaxyMembers.starBalance,
    })
    .from(galaxyMembers)
    .where(eq(galaxyMembers.galaxyId, actor.agent.galaxyId));

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const protocol = req.headers.get("x-forwarded-proto") || (url.protocol.startsWith("https") ? "https" : "http");
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    agent: {
      id: actor.agent.id,
      agentName: actor.agent.agentName,
      crew: actor.agent.crew,
      directive: actor.agent.directive,
      tagMode: actor.agent.tagMode,
      rune: actor.agent.rune,
      color: actor.agent.color,
      stencilMap: actor.agent.stencilMap,
      scope: actor.agent.scope,
      status: actor.agent.status,
      actionCount: actor.agent.actionCount + 1,
      lastUsedAt: actor.agent.lastUsedAt,
    },
    onBehalfOf: {
      memberId: actor.agent.memberId,
      displayName: actor.agent.memberDisplayName,
      color: actor.agent.memberColor,
      role: actor.agent.memberRole,
    },
    galaxy: galaxy
      ? {
          id: galaxy.id,
          name: galaxy.name,
          timezone: galaxy.timezone,
          familyColor: galaxy.familyColor,
          familyAvatar: galaxy.familyAvatar,
        }
      : null,
    inhabitants: members,
    endpoints: {
      events: `${baseUrl}/api/events`,
      lists: `${baseUrl}/api/lists`,
      chores: `${baseUrl}/api/chores`,
      meals: `${baseUrl}/api/meals`,
      galaxies: `${baseUrl}/api/galaxies`,
    },
  });
}
