import crypto from "crypto";
import { db } from "@/db";
import { agentKeys, galaxyMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "./auth-helpers";

export type AgentScope = "admin" | "standard" | "kid" | "readonly";
export type AgentStatus = "active" | "revoked";
export type AgentTagMode = "rune" | "stencil16";

export interface AgentBadgeInfo {
  id: string;
  agentName: string;
  crew: string | null;
  directive: string | null;
  tagMode: AgentTagMode;
  rune: string;
  color: string;
  stencilMap: string | null;
  scope: AgentScope;
  status: AgentStatus;
  actionCount: number;
  lastUsedAt: string | null;
}

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
 * Built-in 16x16 Pixel Art Stencil presets (64 hex chars = 256 bits)
 * Rescued from tomasmed.dev Bot Wall format.
 */
export const STENCIL_PRESETS: Record<string, { name: string; hex: string }> = {
  robot: {
    name: "Robot",
    hex: "000007e00ff018181ff814281ff810081ff80ff00bd010081ff8181800000000",
  },
  star: {
    name: "Star",
    hex: "01000380038007c00ee01c7038387ffce007381c1c380ee007c0038001000000",
  },
  lightning: {
    name: "Lightning",
    hex: "004000c00180030006000fc01fc000c00180030006000c001800100000000000",
  },
  skull: {
    name: "Skull",
    hex: "07e01ff03ff83ff836d836d81ff00ff007e00bd01e781e780ff0000000000000",
  },
  alien: {
    name: "Alien Envoy",
    hex: "0e701ff83ffc7ebd7ebd7ffd7ebd3ffc1ff80bd0181818180810000000000000",
  },
};

/**
 * Validates a 64-character hexadecimal stencil string (16x16 1-bit bitmap).
 */
export function isValidStencil16(hex?: string | null): boolean {
  if (!hex || typeof hex !== "string") return false;
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

/**
 * Decodes a 64-hex-char stencil into a 16x16 boolean grid.
 */
export function decodeStencil16ToGrid(hex: string): boolean[][] {
  const cleanHex = hex.trim().toLowerCase();
  const grid: boolean[][] = [];
  let bitIndex = 0;

  for (let r = 0; r < 16; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < 16; c++) {
      const hexCharIdx = Math.floor(bitIndex / 4);
      const bitWithinChar = 3 - (bitIndex % 4);
      const val = parseInt(cleanHex[hexCharIdx] || "0", 16);
      row.push(((val >> bitWithinChar) & 1) === 1);
      bitIndex++;
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Encodes a 16x16 boolean grid into a 64-hex-char stencil string.
 */
export function encodeGridToStencil16(grid: boolean[][]): string {
  let hex = "";
  let currentNibble = 0;
  let bitCount = 0;

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const bit = grid[r]?.[c] ? 1 : 0;
      currentNibble = (currentNibble << 1) | bit;
      bitCount++;
      if (bitCount === 4) {
        hex += currentNibble.toString(16);
        currentNibble = 0;
        bitCount = 0;
      }
    }
  }
  return hex;
}

/**
 * Sanitizes a UTF-8 rune glyph, defaulting to "◈".
 */
export function sanitizeRune(input?: string | null, isBuffed: boolean = false): string {
  if (isBuffed) return "∅";
  if (!input || typeof input !== "string") return "◈";
  const trimmed = input.trim();
  if (!trimmed) return "◈";
  // Return first grapheme cluster / character
  return Array.from(trimmed)[0] || "◈";
}

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
