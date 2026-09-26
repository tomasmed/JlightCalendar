import { NextResponse } from "next/server";
import { db } from "@/db";
import { galaxyMembers, galaxies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess, ensureDbUser } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galaxyId } = await params;
    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      userId,
      session?.user?.email
    );
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
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      userId,
      session?.user?.email
    );
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galaxyId } = await params;
    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      userId,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to manage inhabitants in this galaxy." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let memberId = searchParams.get("memberId");
    if (!memberId) {
      try {
        const body = await req.json();
        memberId = body.memberId;
      } catch {
        // body might be empty if sent as url param
      }
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required to remove an inhabitant." },
        { status: 400 }
      );
    }

    // Verify member exists in this galaxy
    const targetMembers = await db
      .select()
      .from(galaxyMembers)
      .where(
        and(
          eq(galaxyMembers.id, memberId),
          eq(galaxyMembers.galaxyId, galaxyId)
        )
      )
      .limit(1);

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: "Member not found in this galaxy." },
        { status: 404 }
      );
    }

    const targetMember = targetMembers[0];

    // Protect Galaxy Owner from deletion
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "The galaxy owner cannot be removed from the galaxy." },
        { status: 400 }
      );
    }

    // Verify against galaxy ownerId if linked
    const galaxyList = await db
      .select()
      .from(galaxies)
      .where(eq(galaxies.id, galaxyId))
      .limit(1);

    if (
      galaxyList.length > 0 &&
      targetMember.userId &&
      galaxyList[0].ownerId === targetMember.userId
    ) {
      return NextResponse.json(
        { error: "The galaxy owner cannot be removed from the galaxy." },
        { status: 400 }
      );
    }

    // Delete the inhabitant
    await db
      .delete(galaxyMembers)
      .where(
        and(
          eq(galaxyMembers.id, memberId),
          eq(galaxyMembers.galaxyId, galaxyId)
        )
      );

    return NextResponse.json({
      success: true,
      removedMemberId: memberId,
    });
  } catch (error) {
    console.error("Failed to remove galaxy member:", error);
    return NextResponse.json(
      { error: "Failed to remove galaxy member" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galaxyId } = await params;
    const session = await auth();
    let userId = session?.user?.id;
    if (session?.user) {
      const ensuredId = await ensureDbUser(session.user);
      if (ensuredId) userId = ensuredId;
    }

    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      userId,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to update inhabitants in this galaxy." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { memberId, displayName, color, avatarIcon, role } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required to update an inhabitant." },
        { status: 400 }
      );
    }

    // Verify member exists in this galaxy
    const targetMembers = await db
      .select()
      .from(galaxyMembers)
      .where(
        and(
          eq(galaxyMembers.id, memberId),
          eq(galaxyMembers.galaxyId, galaxyId)
        )
      )
      .limit(1);

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: "Member not found in this galaxy." },
        { status: 404 }
      );
    }

    const targetMember = targetMembers[0];

    const updates: Partial<{
      displayName: string;
      color: string;
      avatarIcon: string;
      role: "owner" | "admin" | "member" | "viewer" | "kid" | "pet";
    }> = {};

    if (displayName && typeof displayName === "string" && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (color && typeof color === "string") {
      updates.color = color;
    }
    if (avatarIcon && typeof avatarIcon === "string") {
      updates.avatarIcon = avatarIcon;
    }
    if (role && typeof role === "string") {
      if (targetMember.role === "owner" && role !== "owner") {
        // preserve owner role
      } else {
        updates.role = role as "owner" | "admin" | "member" | "viewer" | "kid" | "pet";
      }
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(galaxyMembers)
        .set(updates)
        .where(
          and(
            eq(galaxyMembers.id, memberId),
            eq(galaxyMembers.galaxyId, galaxyId)
          )
        );
    }

    const [updatedMember] = await db
      .select()
      .from(galaxyMembers)
      .where(
        and(
          eq(galaxyMembers.id, memberId),
          eq(galaxyMembers.galaxyId, galaxyId)
        )
      )
      .limit(1);

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error) {
    console.error("Failed to update galaxy member:", error);
    return NextResponse.json(
      { error: "Failed to update galaxy member" },
      { status: 500 }
    );
  }
}
