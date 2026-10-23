import crypto from "crypto";
import { db } from "@/db";
import { agentKeys, galaxyMembers, galaxies } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "./auth-helpers";
import { purgeExpiredComets } from "@/db/ensure-schema";

export * from "./agent-types";
import {
  AgentBadgeInfo,
  AgentScope,
  AgentStatus,
  AgentTagMode,
  isValidStencil16,
  sanitizeRune,
} from "./agent-types";

export interface AgentActor {
  kind: "agent";
  agent: AgentBadgeInfo & {
    galaxyId: string;
    memberId: string;
    memberDisplayName: string;
    memberColor: string;
    memberRole: string;
    createdByUserId: string | null;
  };
}

export interface HumanActor {
  kind: "human";
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export interface InvalidAgentActor {
  kind: "invalid_agent";
  status: 401 | 403;
  error: string;
}

export type RequestActor = AgentActor | HumanActor | InvalidAgentActor;

/**
 * Hashes an agent secret using SHA-256.
 */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Generates a new Personal Access Token for an agent:
 * Format: jlight_ag_<32-byte-hex>
 */
export function generateAgentPat(): {
  rawToken: string;
  tokenHash: string;
  keyPrefix: string;
} {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawToken = `jlight_ag_${randomBytes}`;
  const tokenHash = hashSecret(rawToken);
  const keyPrefix = `${rawToken.slice(0, 14)}...${rawToken.slice(-4)}`;
  return { rawToken, tokenHash, keyPrefix };
}

/**
 * Generates Device Code handshake credentials:
 * deviceCode: jlight_dc_<hex>
 * userCode: BOT-XXXX (e.g. BOT-4829)
 */
export function generateDeviceHandshakeCodes(): {
  deviceCode: string;
  deviceCodeHash: string;
  userCode: string;
} {
  const rawCode = `jlight_dc_${crypto.randomBytes(24).toString("hex")}`;
  const deviceCodeHash = hashSecret(rawCode);
  const digits = Math.floor(1000 + Math.random() * 9000);
  const userCode = `BOT-${digits}`;
  return { deviceCode: rawCode, deviceCodeHash, userCode };
}

/**
 * Resolves the actor making the request:
 * 1. Checks `Authorization: Bearer ...` for an agent token.
 * 2. If present: resolves agent key, enforces active status.
 * 3. If absent: falls back to NextAuth human session.
 */
export async function resolveRequestActor(req: Request): Promise<RequestActor> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) {
      return {
        kind: "invalid_agent",
        status: 401,
        error: "Missing bearer token in Authorization header.",
      };
    }

    const tokenHash = hashSecret(rawToken);

    try {
      const records = await db
        .select({
          agent: agentKeys,
          member: galaxyMembers,
        })
        .from(agentKeys)
        .innerJoin(galaxyMembers, eq(agentKeys.memberId, galaxyMembers.id))
        .where(eq(agentKeys.tokenHash, tokenHash))
        .limit(1);

      if (records.length === 0) {
        return {
          kind: "invalid_agent",
          status: 401,
          error: "Invalid agent token.",
        };
      }

      const { agent, member } = records[0];

      if (agent.status === "revoked") {
        return {
          kind: "invalid_agent",
          status: 403,
          error: "Agent key has been buffed (∅) / revoked.",
        };
      }

      return {
        kind: "agent",
        agent: {
          id: agent.id,
          galaxyId: agent.galaxyId,
          memberId: agent.memberId,
          memberDisplayName: member.displayName,
          memberColor: member.color,
          memberRole: member.role,
          createdByUserId: agent.createdByUserId,
          agentName: agent.agentName,
          crew: agent.crew,
          directive: agent.directive,
          tagMode: agent.tagMode as AgentTagMode,
          rune: agent.rune,
          color: agent.color,
          stencilMap: agent.stencilMap,
          scope: agent.scope as AgentScope,
          status: agent.status as AgentStatus,
          actionCount: agent.actionCount,
          lastUsedAt: agent.lastUsedAt,
        },
      };
    } catch (err) {
      console.error("Error resolving agent token:", err);
      return {
        kind: "invalid_agent",
        status: 401,
        error: "Failed to authenticate agent token.",
      };
    }
  }

  // Fallback to NextAuth human session
  try {
    const session = await auth();
    return {
      kind: "human",
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    };
  } catch {
    return { kind: "human" };
  }
}

export interface VerifyActorAccessOptions {
  requireWrite?: boolean;
  requireAdmin?: boolean;
  allowKidWrite?: boolean;
}

/**
 * Enforces galaxy access and scope matrix across Agent and Human actors.
 */
export async function verifyActorGalaxyAccess(
  actor: RequestActor,
  galaxyId: string,
  options: VerifyActorAccessOptions = {}
): Promise<{ allowed: boolean; status?: number; error?: string }> {
  if (actor.kind === "invalid_agent") {
    return { allowed: false, status: actor.status, error: actor.error };
  }

  if (actor.kind === "agent") {
    // Cross-galaxy security boundary
    if (actor.agent.galaxyId !== galaxyId) {
      return {
        allowed: false,
        status: 403,
        error: "Forbidden: Agent is not authorized for this galaxy.",
      };
    }

    // Verify bound galaxy/comet still exists and has not expired
    const [targetGalaxy] = await db
      .select()
      .from(galaxies)
      .where(eq(galaxies.id, galaxyId))
      .limit(1);

    if (!targetGalaxy) {
      return {
        allowed: false,
        status: 404,
        error: "Target galaxy or comet no longer exists.",
      };
    }

    if (
      targetGalaxy.isEphemeral &&
      targetGalaxy.expiresAt &&
      new Date(targetGalaxy.expiresAt).getTime() <= Date.now()
    ) {
      await purgeExpiredComets();
      return {
        allowed: false,
        status: 410,
        error: "This ephemeral Comet calendar has expired and spun down.",
      };
    }

    const { scope } = actor.agent;

    // Scope Matrix:
    // readonly: No writes or admin
    if (scope === "readonly" && (options.requireWrite || options.requireAdmin)) {
      return {
        allowed: false,
        status: 403,
        error: "Forbidden: Agent has readonly scope and cannot perform write actions.",
      };
    }

    // kid: Can read and toggle chores (allowKidWrite), but cannot do other writes or admin
    if (scope === "kid") {
      if (options.requireAdmin) {
        return {
          allowed: false,
          status: 403,
          error: "Forbidden: Kid-scoped agent cannot perform admin actions.",
        };
      }
      if (options.requireWrite && !options.allowKidWrite) {
        return {
          allowed: false,
          status: 403,
          error: "Forbidden: Kid-scoped agent is not permitted for this action.",
        };
      }
    }

    // standard: Can read & write, but cannot perform requireAdmin
    if (scope === "standard" && options.requireAdmin) {
      return {
        allowed: false,
        status: 403,
        error: "Forbidden: Standard-scoped agent cannot perform admin actions.",
      };
    }

    return { allowed: true };
  }

  // Human actor: Delegate to verifyGalaxyAccess
  const hasAccess = await verifyGalaxyAccess(galaxyId, actor.userId, actor.userEmail);
  if (!hasAccess) {
    return {
      allowed: false,
      status: 403,
      error: "Forbidden: User does not have access to this galaxy.",
    };
  }

  return { allowed: true };
}

/**
 * Increment agent action count and touch lastUsedAt.
 */
export async function recordAgentAction(agentId: string): Promise<void> {
  try {
    await db
      .update(agentKeys)
      .set({
        actionCount: sql`${agentKeys.actionCount} + 1`,
        lastUsedAt: new Date().toISOString(),
      })
      .where(eq(agentKeys.id, agentId));
  } catch (err) {
    console.error("Failed to record agent action:", err);
  }
}

/**
 * Fetch all agent keys for a galaxy into an O(1) Map for provenance badge enrichment.
 */
export async function getGalaxyAgentMap(
  galaxyId: string
): Promise<Map<string, AgentBadgeInfo>> {
  try {
    const rows = await db
      .select()
      .from(agentKeys)
      .where(eq(agentKeys.galaxyId, galaxyId));

    const map = new Map<string, AgentBadgeInfo>();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        agentName: r.agentName,
        crew: r.crew,
        directive: r.directive,
        tagMode: r.tagMode as AgentTagMode,
        rune: r.status === "revoked" ? "∅" : r.rune,
        color: r.color,
        stencilMap: r.stencilMap,
        scope: r.scope as AgentScope,
        status: r.status as AgentStatus,
        actionCount: r.actionCount,
        lastUsedAt: r.lastUsedAt,
      });
    }
    return map;
  } catch (err) {
    console.error("Failed to load galaxy agent map:", err);
    return new Map();
  }
}
