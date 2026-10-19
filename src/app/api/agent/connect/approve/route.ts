import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentDeviceCodes, agentKeys, galaxyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  generateAgentPat,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/connect/approve?userCode=BOT-XXXX
 * Previews the agent that requested connection so the human can review it.
 */
export async function GET(req: Request) {
  await ensureDatabaseSchema();
  const { searchParams } = new URL(req.url);
  const userCode = searchParams.get("userCode")?.toUpperCase().trim();

  if (!userCode) {
    return NextResponse.json({ error: "userCode is required." }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(agentDeviceCodes)
    .where(eq(agentDeviceCodes.userCode, userCode))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired bot code." }, { status: 404 });
  }

  const record = rows[0];
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (record.status === "expired" || record.expiresAt < nowSeconds) {
    return NextResponse.json(
      { error: "This connection request has expired." },
      { status: 410 }
    );
  }

  return NextResponse.json({
    id: record.id,
    userCode: record.userCode,
    agentName: record.agentName,
    crew: record.crew,
    directive: record.directive,
    tagMode: record.tagMode,
    rune: record.rune,
    color: record.color,
    stencilMap: record.stencilMap,
    requestedScope: record.requestedScope,
    status: record.status,
  });
}

/**
 * POST /api/agent/connect/approve
 * Human operator approves or denies the agent's connection request,
 * binding the agent to a Galaxy and Inhabitant ("User N's Agent").
 */
export async function POST(req: Request) {
  await ensureDatabaseSchema();
  const actor = await resolveRequestActor(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    userCode: rawUserCode,
    action = "approve", // "approve" | "deny"
    galaxyId: rawGalaxyId,
    memberId,
    scope: approvedScope,
  } = body;

  const userCode = rawUserCode ? String(rawUserCode).toUpperCase().trim() : "";
  if (!userCode) {
    return NextResponse.json({ error: "userCode is required." }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(agentDeviceCodes)
    .where(eq(agentDeviceCodes.userCode, userCode))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Connection request not found." }, { status: 404 });
  }

  const record = rows[0];

  if (action === "deny") {
    await db
      .update(agentDeviceCodes)
      .set({ status: "denied" })
      .where(eq(agentDeviceCodes.id, record.id));

    return NextResponse.json({ success: true, status: "denied" });
  }

  // Handle approval
  const galaxyId =
    rawGalaxyId ||
    (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required. An agent must be bound to a Galaxy Inhabitant." },
      { status: 400 }
    );
  }

  // Ensure member exists in this galaxy
  const memberRows = await db
    .select()
    .from(galaxyMembers)
    .where(
      eq(galaxyMembers.id, memberId)
    )
    .limit(1);

  if (memberRows.length === 0 || memberRows[0].galaxyId !== galaxyId) {
    return NextResponse.json(
      { error: "Target Inhabitant memberId does not belong to this galaxy." },
      { status: 400 }
    );
  }

  const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status || 403 });
  }

  const finalScope = approvedScope || record.requestedScope || "standard";
  const { rawToken, tokenHash, keyPrefix } = generateAgentPat();
  const agentKeyId = crypto.randomUUID();

  // Create active agentKey
  await db.insert(agentKeys).values({
    id: agentKeyId,
    galaxyId,
    memberId,
    createdByUserId: actor.kind === "human" ? actor.userId : null,
    tokenHash,
    keyPrefix,
    agentName: record.agentName,
    crew: record.crew,
    directive: record.directive,
    tagMode: record.tagMode,
    rune: record.rune,
    color: record.color,
    stencilMap: record.stencilMap,
    scope: ["admin", "standard", "kid", "readonly"].includes(finalScope)
      ? finalScope
      : "standard",
    status: "active",
  });

  // Mark device code approved and store raw token for agent pickup
  await db
    .update(agentDeviceCodes)
    .set({
      status: "approved",
      galaxyId,
      memberId,
      agentKeyId,
      mintedRawToken: rawToken,
    })
    .where(eq(agentDeviceCodes.id, record.id));

  return NextResponse.json({
    success: true,
    status: "approved",
    agentName: record.agentName,
    boundMember: memberRows[0].displayName,
    scope: finalScope,
  });
}
