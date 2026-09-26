import { NextResponse } from "next/server";
import { db } from "@/db";
import { galaxyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galaxyId } = await params;
    const session = await auth();

    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to view this galaxy's inhabitants." },
        { status: 403 }
      );
    }

    const members = await db
      .select()
      .from(galaxyMembers)
      .where(eq(galaxyMembers.galaxyId, galaxyId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch galaxy members:", error);
    return NextResponse.json(
      { error: "Failed to fetch galaxy members" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galaxyId } = await params;
    const session = await auth();

    const hasAccess = await verifyGalaxyAccess(galaxyId, session?.user?.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to add inhabitants to this galaxy." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      displayName,
      role = "member",
      color = "#8b5cf6",
      avatarIcon = "user",
    } = body;

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const memberId = crypto.randomUUID();

    // Insert new inhabitant (supports pets & kids with no Google account)
    await db.insert(galaxyMembers).values({
      id: memberId,
      galaxyId,
      displayName,
      role,
      color,
      avatarIcon,
      starBalance: 0,
      isKioskProfile: false,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: memberId,
        galaxyId,
        displayName,
        role,
        color,
        avatarIcon,
        starBalance: 0,
      },
    });
  } catch (error) {
    console.error("Failed to add galaxy member:", error);
    return NextResponse.json(
      { error: "Failed to add galaxy member" },
      { status: 500 }
    );
  }
}
