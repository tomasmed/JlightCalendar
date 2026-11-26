import crypto from "crypto";
import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import {
  users,
  galaxies,
  galaxyMembers,
  calendars,
  generateJoinCode,
} from "@/db/schema";
import { ensureDbUser } from "@/lib/auth-helpers";
import { resolveAuthSecret } from "@/auth";

const SESSION_COOKIE_NAME = "authjs.session-token";

/**
 * Test-only browser session bridge for Playwright E2E and local @playwright/mcp verification.
 * Strictly returns 404 unless JLIGHT_TEST_MODE === "true".
 */
export async function POST(request: Request) {
  if (process.env.JLIGHT_TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  await ensureDatabaseSchema();

  let body: {
    id?: string;
    email?: string;
    name?: string;
    galaxyName?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    // Allow empty body with default test user
  }

  const email = (body.email || "alice@jlight.test").trim().toLowerCase();
  const name = (body.name || "Captain Alice").trim();
  const requestedId = body.id?.trim() || undefined;

  const userId = await ensureDbUser({
    id: requestedId,
    email,
    name,
  });

  if (!userId) {
    return NextResponse.json(
      { error: "Failed to provision test user" },
      { status: 500 }
    );
  }

  // Ensure the test user has at least one Galaxy & Primary Orbit calendar
  const existingMemberships = await db
    .select({ galaxyId: galaxyMembers.galaxyId })
    .from(galaxyMembers)
    .where(eq(galaxyMembers.userId, userId))
    .limit(1);

  let galaxyId = existingMemberships[0]?.galaxyId;

  if (!galaxyId) {
    galaxyId = crypto.randomUUID();
    const galaxyName = body.galaxyName?.trim() || `${name}'s Family Galaxy`;

    await db.insert(galaxies).values({
      id: galaxyId,
      name: galaxyName,
      ownerId: userId,
      theme: "milky-way",
      icon: "sparkles",
      joinCode: generateJoinCode(),
    });

    await db.insert(galaxyMembers).values({
      id: crypto.randomUUID(),
      galaxyId,
      userId,
      displayName: name,
      role: "owner",
      color: "#ec4899",
      avatarIcon: "user",
    });

    await db.insert(calendars).values({
      id: crypto.randomUUID(),
      galaxyId,
      name: "Primary Orbit",
      isPrimary: true,
      color: "#8b5cf6",
    });

    await db
      .update(users)
      .set({ defaultGalaxyId: galaxyId })
      .where(eq(users.id, userId));
  }

  const token = await encode({
    token: {
      sub: userId,
      id: userId,
      email,
      name,
    },
    secret: resolveAuthSecret(),
    salt: SESSION_COOKIE_NAME,
    maxAge: 60 * 60 * 24,
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: userId, email, name },
    galaxyId,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 60 * 60 * 24,
  });

  return response;
}
