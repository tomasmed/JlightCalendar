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
