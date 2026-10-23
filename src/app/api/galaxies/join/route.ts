import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureDatabaseSchema, purgeExpiredComets } from "@/db/ensure-schema";
import { galaxies, galaxyMembers, normalizeJoinCode } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();
    const session = await auth();
    const userId = session?.user?.id;

    const body = await req.json();
    const rawCode = body?.joinCode;
    const guestName = body?.guestName;

    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { error: "A valid galaxy or comet join code is required." },
        { status: 400 }
      );
    }

    const rawUpper = rawCode.trim().toUpperCase();
    const joinCode = normalizeJoinCode(rawCode);

    // 1. Locate the galaxy or comet with this join code (normalized, exact, or slug)
    let matching = await db
      .select()
      .from(galaxies)
      .where(
        or(
          eq(galaxies.joinCode, joinCode),
          eq(galaxies.joinCode, rawUpper),
          eq(galaxies.slug, rawCode.trim().toLowerCase())
        )
      );

    // If it's a permanent galaxy (or not found yet) and user is unauthenticated, require sign-in first
    if (matching.length === 0) {
      if (!userId) {
        return NextResponse.json(
          { error: "You must be signed in to join a galaxy." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "No galaxy or comet found matching code: " + joinCode + ". Please check with the owner." },
        { status: 404 }
      );
    }

    const targetGalaxy = matching[0];

    // If target is an Ephemeral Comet and user is not signed in, allow guest access!
    if (targetGalaxy.isEphemeral && !userId) {
      if (guestName && typeof guestName === "string" && guestName.trim()) {
        await db.insert(galaxyMembers).values({
          id: crypto.randomUUID(),
          galaxyId: targetGalaxy.id,
          userId: null,
          displayName: guestName.trim(),
          role: "member",
          color: "#06b6d4",
          avatarIcon: "user",
        });
      }
      return NextResponse.json({
        success: true,
        isEphemeral: true,
        galaxy: targetGalaxy,
        message: `Connected to ephemeral Comet "${targetGalaxy.name}"!`,
      });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to join a galaxy." },
        { status: 401 }
      );
    }

    // 2. Check if user is already an owner or member
    const existing = await db
      .select()
      .from(galaxyMembers)
      .where(
        and(
          eq(galaxyMembers.galaxyId, targetGalaxy.id),
          eq(galaxyMembers.userId, userId)
        )
      );

    if (existing.length > 0 || targetGalaxy.ownerId === userId) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        galaxy: targetGalaxy,
        message: `You are already part of "${targetGalaxy.name}".`,
      });
    }

    // 3. Add user as member to galaxy
    const memberId = crypto.randomUUID();
    const displayName = session.user?.name || "Starlight Inhabitant";

    await db.insert(galaxyMembers).values({
      id: memberId,
      galaxyId: targetGalaxy.id,
      userId,
      displayName,
      role: "member",
      color: "#8b5cf6",
      avatarIcon: "user",
    });

    return NextResponse.json({
      success: true,
      alreadyMember: false,
      galaxy: targetGalaxy,
      message: `Successfully joined "${targetGalaxy.name}"!`,
    });
  } catch (error) {
    console.error("Failed to join galaxy:", error);
    return NextResponse.json(
      { error: "Failed to join galaxy. Please try again." },
      { status: 500 }
    );
  }
}
