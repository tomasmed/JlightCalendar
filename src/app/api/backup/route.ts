import { NextResponse } from "next/server";
import { createLocalDatabaseBackup } from "@/lib/backup";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const label = body.label || "scheduled";
    const backupPath = await createLocalDatabaseBackup(label);

    return NextResponse.json({
      success: true,
      backupPath: backupPath || "cloud-replicated",
    });
  } catch (error) {
    console.error("Failed to run database backup:", error);
    return NextResponse.json({ error: "Failed to create database backup" }, { status: 500 });
  }
}
