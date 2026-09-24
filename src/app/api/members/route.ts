import { NextResponse } from "next/server";
import { db } from "@/db";
import { familyMembers } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const members = await db
      .select()
      .from(familyMembers)
      .orderBy(asc(familyMembers.createdAt));

    const mapped = members.map((m) => ({
      id: m.id,
      name: m.displayName,
      displayName: m.displayName,
      color: m.color,
      avatarIcon: m.avatarIcon,
      role: m.role,
      starBalance: m.starBalance,
    }));

    return NextResponse.json({ members: mapped });
  } catch (error) {
    console.error("Failed to fetch family members:", error);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
