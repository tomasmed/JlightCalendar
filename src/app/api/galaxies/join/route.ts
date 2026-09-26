import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { galaxies, galaxyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to join a galaxy." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rawCode = body?.joinCode;

    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { error: "A valid galaxy join code is required." },
        { status: 400 }
      );
    }

    const joinCode = rawCode.trim().toUpperCase();

    // 1. Locate the galaxy with this join code
    const matching = await db
      .select()
      .from(galaxies)
      .where(eq(galaxies.joinCode, joinCode));

    if (matching.length === 0) {
      return NextResponse.json(
        { error: "No galaxy found matching code: " + joinCode + ". Please check with the galaxy owner." },
        { status: 404 }
      );
    }

    const targetGalaxy = matching[0];

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
