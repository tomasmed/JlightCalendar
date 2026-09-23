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

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch family members:", error);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
