import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  galaxies,
  galaxyMembers,
  normalizeJoinCode,
} from "@/db/schema";
import { eq, or } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema, purgeExpiredComets } from "@/db/ensure-schema";
import {
  generateIcsCalendar,
  filterEventsForTimeWindow,
} from "@/lib/ics";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    await purgeExpiredComets();

    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);

    const rawGalaxyId =
      searchParams.get("galaxyId") ||
      searchParams.get("cometId") ||
      searchParams.get("code") ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!rawGalaxyId) {
      return NextResponse.json(
        { error: "galaxyId or code is required to export calendar events." },
        { status: 400 }
      );
    }

    // Resolve galaxy by ID, joinCode, or slug
    const normalizedCode = normalizeJoinCode(rawGalaxyId);
    const matchedGalaxies = await db
      .select()
      .from(galaxies)
      .where(
        or(
          eq(galaxies.id, rawGalaxyId),
          eq(galaxies.joinCode, normalizedCode),
          eq(galaxies.joinCode, rawGalaxyId.toUpperCase()),
          eq(galaxies.slug, rawGalaxyId.toLowerCase())
        )
      )
      .limit(1);

    if (matchedGalaxies.length === 0) {
      return NextResponse.json(
        { error: "Calendar Galaxy or Comet not found (or has expired)." },
        { status: 404 }
      );
    }

    const targetGalaxy = matchedGalaxies[0];
    const galaxyId = targetGalaxy.id;

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You do not have permission to export this calendar.",
        },
        { status: access.status || 403 }
      );
    }

    const startDate =
      searchParams.get("start") || searchParams.get("from") || undefined;
    const endDate =
      searchParams.get("end") || searchParams.get("to") || undefined;
    const memberId = searchParams.get("memberId") || undefined;
    const modeParam = searchParams.get("mode");
    const mode: "expanded" | "rrule" =
      modeParam === "rrule"
        ? "rrule"
        : modeParam === "expanded"
        ? "expanded"
        : startDate && endDate
        ? "expanded"
        : "rrule";
    const format = (searchParams.get("format") || "ics").toLowerCase();

    const [galaxyEvents, members] = await Promise.all([
      db.select().from(events).where(eq(events.galaxyId, galaxyId)),
      db
        .select()
        .from(galaxyMembers)
        .where(eq(galaxyMembers.galaxyId, galaxyId)),
    ]);

    const participants = members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      role: m.role,
    }));

    const windowEvents = filterEventsForTimeWindow(galaxyEvents, {
      startDate,
      endDate,
      memberId,
      mode,
    });

    const icsContent = generateIcsCalendar(galaxyEvents, {
      calendarName: targetGalaxy.name,
      description: targetGalaxy.isEphemeral
        ? `Jlight Ephemeral Comet (${targetGalaxy.joinCode || targetGalaxy.id})`
        : `Jlight Family Galaxy (${targetGalaxy.name})`,
      timezone: targetGalaxy.timezone || "America/New_York",
      startDate,
      endDate,
      memberId,
      mode,
      participants,
    });

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    if (format === "json") {
      return NextResponse.json({
        galaxyId: targetGalaxy.id,
        calendarName: targetGalaxy.name,
        isEphemeral: targetGalaxy.isEphemeral,
        expiresAt: targetGalaxy.expiresAt,
        startDate: startDate || null,
        endDate: endDate || null,
        mode,
        eventCount: windowEvents.length,
        events: windowEvents,
        ics: icsContent,
      });
    }

    const safeSlug =
      (targetGalaxy.slug || targetGalaxy.name || "jlight-calendar")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "jlight-calendar";
    const windowSuffix =
      startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : startDate
        ? `_from_${startDate}`
        : "";
    const filename = `${safeSlug}${windowSuffix}.ics`;

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export calendar (.ics):", error);
    return NextResponse.json(
      { error: "Failed to export calendar events" },
      { status: 500 }
    );
  }
}
