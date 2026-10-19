import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentDeviceCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateDeviceHandshakeCodes,
  hashSecret,
  isValidStencil16,
  sanitizeRune,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/connect
 * Initiates an agent-requested handshake (Device Code Flow).
 */
export async function POST(req: Request) {
  await ensureDatabaseSchema();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Default empty body is allowed
  }

  const {
    agentName = "Autonomous Envoy",
    crew,
    directive,
    tagMode = "rune",
    rune = "◈",
    color = "#06b6d4",
    stencilMap,
    requestedScope = "standard",
  } = body;

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

  const { deviceCode, deviceCodeHash, userCode } = generateDeviceHandshakeCodes();
  const id = crypto.randomUUID();
  const ttlSeconds = 900; // 15 minutes
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  await db.insert(agentDeviceCodes).values({
    id,
    deviceCodeHash,
    userCode,
    agentName: String(agentName).trim() || "Autonomous Envoy",
    crew: crew ? String(crew).trim() : null,
    directive: directive ? String(directive).trim() : null,
    tagMode: tagMode === "stencil16" ? "stencil16" : "rune",
    rune: sanitizeRune(rune),
    color: color ? String(color).trim() : "#06b6d4",
    stencilMap: cleanStencil,
    requestedScope: ["admin", "standard", "kid", "readonly"].includes(
      requestedScope
    )
      ? requestedScope
      : "standard",
    status: "pending",
    expiresAt,
  });

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const protocol = req.headers.get("x-forwarded-proto") || (url.protocol.startsWith("https") ? "https" : "http");
  const baseUrl = `${protocol}://${host}`;
  const verificationUri = `${baseUrl}/?claimBot=${userCode}`;

  return NextResponse.json({
    deviceCode,
    userCode,
    verificationUri,
    expiresIn: ttlSeconds,
    interval: 3,
    instruction: `Tell your human: "Please visit ${verificationUri} to approve my agent credentials." Then poll GET /api/agent/connect?deviceCode=${deviceCode} every 3 seconds.`,
  });
}

/**
 * GET /api/agent/connect?deviceCode=...
 * Agent polls to receive approval status and the minted bearer token.
 */
export async function GET(req: Request) {
  await ensureDatabaseSchema();
  const { searchParams } = new URL(req.url);
  const deviceCode = searchParams.get("deviceCode");

  if (!deviceCode) {
    return NextResponse.json({ error: "deviceCode parameter is required." }, { status: 400 });
  }

  const deviceCodeHash = hashSecret(deviceCode);
  const rows = await db
    .select()
    .from(agentDeviceCodes)
    .where(eq(agentDeviceCodes.deviceCodeHash, deviceCodeHash))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Handshake session not found." }, { status: 404 });
  }

  const record = rows[0];
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (record.status === "expired" || record.expiresAt < nowSeconds) {
    if (record.status !== "expired") {
      await db
        .update(agentDeviceCodes)
        .set({ status: "expired" })
        .where(eq(agentDeviceCodes.id, record.id));
    }
    return NextResponse.json(
      { error: "Handshake session has expired. Please initiate a new connection." },
      { status: 410 }
    );
  }

  if (record.status === "denied") {
    return NextResponse.json(
      { error: "Connection request was denied by the human operator." },
      { status: 403 }
    );
  }

  if (record.status === "pending") {
    return NextResponse.json(
      {
        status: "pending",
        userCode: record.userCode,
        message: "Waiting for human operator approval...",
      },
      { status: 202 }
    );
  }

  if (record.status === "approved") {
    const rawToken = record.mintedRawToken;

    // Immediately clear mintedRawToken from database on first retrieval!
    if (rawToken) {
      await db
        .update(agentDeviceCodes)
        .set({ mintedRawToken: null })
        .where(eq(agentDeviceCodes.id, record.id));

      return NextResponse.json({
        status: "approved",
        token: rawToken,
        agentKeyId: record.agentKeyId,
        galaxyId: record.galaxyId,
        memberId: record.memberId,
        message:
          "Authentication approved! Save this token securely; it cannot be retrieved again.",
      });
    }

    // If token was already consumed
    return NextResponse.json({
      status: "approved",
      token: null,
      message:
        "Authentication was previously approved and token was already retrieved.",
    });
  }

  return NextResponse.json({ status: record.status });
}
