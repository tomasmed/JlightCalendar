import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentKeys, galaxyMembers, galaxies } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  generateAgentPat,
  isValidStencil16,
  sanitizeRune,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/keys?galaxyId=...
 * Lists all agent credentials for the galaxy (active and buffed).
 */
export async function GET(req: Request) {
  await ensureDatabaseSchema();
  const actor = await resolveRequestActor(req);
  const { searchParams } = new URL(req.url);
  const rawGalaxyId = searchParams.get("galaxyId");

  const galaxyId =
    rawGalaxyId ||
    (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

  const access = await verifyActorGalaxyAccess(actor, galaxyId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status || 403 });
  }

  const rows = await db
    .select({
      id: agentKeys.id,
      galaxyId: agentKeys.galaxyId,
      memberId: agentKeys.memberId,
      memberDisplayName: galaxyMembers.displayName,
      memberColor: galaxyMembers.color,
      memberRole: galaxyMembers.role,
      memberAvatarIcon: galaxyMembers.avatarIcon,
      keyPrefix: agentKeys.keyPrefix,
      agentName: agentKeys.agentName,
      crew: agentKeys.crew,
      directive: agentKeys.directive,
      tagMode: agentKeys.tagMode,
      rune: agentKeys.rune,
      color: agentKeys.color,
      stencilMap: agentKeys.stencilMap,
      scope: agentKeys.scope,
      status: agentKeys.status,
      actionCount: agentKeys.actionCount,
      lastUsedAt: agentKeys.lastUsedAt,
      revokedAt: agentKeys.revokedAt,
      createdAt: agentKeys.createdAt,
    })
    .from(agentKeys)
    .innerJoin(galaxyMembers, eq(agentKeys.memberId, galaxyMembers.id))
    .where(eq(agentKeys.galaxyId, galaxyId))
    .orderBy(desc(agentKeys.createdAt));

  return NextResponse.json({ keys: rows });
}

/**
 * POST /api/agent/keys
 * Mints a new Agent PAT bound to an Inhabitant ("User N's Agent").
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
    galaxyId: rawGalaxyId,
    memberId,
    agentName,
    crew,
    directive,
    tagMode = "rune",
    rune = "◈",
    color = "#06b6d4",
    stencilMap,
    scope = "standard",
  } = body;

  const galaxyId =
    rawGalaxyId ||
    (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required. An agent must be bound to a Galaxy Inhabitant." },
      { status: 400 }
    );
  }

  if (!agentName || typeof agentName !== "string" || !agentName.trim()) {
    return NextResponse.json({ error: "agentName is required." }, { status: 400 });
  }

  const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireAdmin: true });
  // If human is standard member, allow minting for own household as well
  if (!access.allowed && actor.kind === "human") {
    const standardAccess = await verifyActorGalaxyAccess(actor, galaxyId, {
      requireWrite: true,
    });
    if (!standardAccess.allowed) {
      return NextResponse.json(
        { error: "Forbidden: Cannot mint agent keys without galaxy access." },
        { status: 403 }
      );
    }
  } else if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status || 403 });
  }

  // Validate stencil if tagMode is stencil16
  let cleanStencil = null;
  if (tagMode === "stencil16" && stencilMap) {
    if (!isValidStencil16(stencilMap)) {
      return NextResponse.json(
        { error: "stencilMap must be a 64-hexadecimal character 16x16 bitmap." },
        { status: 400 }
      );
    }
    cleanStencil = stencilMap.toLowerCase().trim();
  }

  const { rawToken, tokenHash, keyPrefix } = generateAgentPat();
  const id = crypto.randomUUID();

  await db.insert(agentKeys).values({
    id,
    galaxyId,
    memberId,
    createdByUserId: actor.kind === "human" ? actor.userId : null,
    tokenHash,
    keyPrefix,
    agentName: agentName.trim(),
    crew: crew ? String(crew).trim() : null,
    directive: directive ? String(directive).trim() : null,
    tagMode: tagMode === "stencil16" ? "stencil16" : "rune",
    rune: sanitizeRune(rune),
    color: color ? String(color).trim() : "#06b6d4",
    stencilMap: cleanStencil,
    scope: ["admin", "standard", "kid", "readonly"].includes(scope)
      ? scope
      : "standard",
    status: "active",
  });

  return NextResponse.json({
    success: true,
    keyId: id,
    token: rawToken, // Displayed once!
    keyPrefix,
    agentName: agentName.trim(),
    scope,
    warning:
      "Save this token now. It will not be shown again and cannot be recovered.",
  });
}

/**
 * PATCH /api/agent/keys
 * Modifies an agent key or triggers The Buff (∅) / Revocation.
 */
export async function PATCH(req: Request) {
  await ensureDatabaseSchema();
  const actor = await resolveRequestActor(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id, action, agentName, crew, directive, tagMode, rune, color, stencilMap, scope, memberId } = body;

  if (!id) {
    return NextResponse.json({ error: "Agent key id is required." }, { status: 400 });
  }

  const keyRows = await db
    .select()
    .from(agentKeys)
    .where(eq(agentKeys.id, id))
    .limit(1);

  if (keyRows.length === 0) {
    return NextResponse.json({ error: "Agent key not found." }, { status: 404 });
  }

  const existing = keyRows[0];
  const access = await verifyActorGalaxyAccess(actor, existing.galaxyId, {
    requireWrite: true,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status || 403 });
  }

  // Handle The Buff (∅) / Revoke
  if (action === "buff" || action === "revoke") {
    await db
      .update(agentKeys)
      .set({
        status: "revoked",
        rune: "∅",
        revokedAt: new Date().toISOString(),
      })
      .where(eq(agentKeys.id, id));

    return NextResponse.json({
      success: true,
      message: "Agent received The Buff (∅). Access revoked.",
    });
  }

  // Update persona or scope
  const updates: Partial<typeof agentKeys.$inferInsert> = {};
  if (agentName) updates.agentName = String(agentName).trim();
  if (crew !== undefined) updates.crew = crew ? String(crew).trim() : null;
  if (directive !== undefined) updates.directive = directive ? String(directive).trim() : null;
  if (tagMode) updates.tagMode = tagMode === "stencil16" ? "stencil16" : "rune";
  if (rune) updates.rune = sanitizeRune(rune);
  if (color) updates.color = String(color).trim();
  if (stencilMap !== undefined) {
    if (stencilMap && !isValidStencil16(stencilMap)) {
      return NextResponse.json({ error: "Invalid 64-hex stencilMap." }, { status: 400 });
    }
    updates.stencilMap = stencilMap ? stencilMap.toLowerCase().trim() : null;
  }
  if (scope && ["admin", "standard", "kid", "readonly"].includes(scope)) {
    updates.scope = scope;
  }
  if (memberId) {
    updates.memberId = memberId;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(agentKeys).set(updates).where(eq(agentKeys.id, id));
  }

  return NextResponse.json({ success: true, updated: updates });
}

/**
 * DELETE /api/agent/keys?id=...
 * Permanently removes an agent record.
 */
export async function DELETE(req: Request) {
  await ensureDatabaseSchema();
  const actor = await resolveRequestActor(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }

  const keyRows = await db
    .select()
    .from(agentKeys)
    .where(eq(agentKeys.id, id))
    .limit(1);

  if (keyRows.length === 0) {
    return NextResponse.json({ error: "Agent key not found." }, { status: 404 });
  }

  const existing = keyRows[0];
  const access = await verifyActorGalaxyAccess(actor, existing.galaxyId, {
    requireAdmin: true,
  });
  if (!access.allowed && actor.kind === "human") {
    const stdAccess = await verifyActorGalaxyAccess(actor, existing.galaxyId, {
      requireWrite: true,
    });
    if (!stdAccess.allowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status || 403 });
  }

  await db.delete(agentKeys).where(eq(agentKeys.id, id));
  return NextResponse.json({ success: true, deletedId: id });
}
