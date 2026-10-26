import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, calendars, galaxies, normalizeJoinCode } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { parseIcsCalendar, ParsedIcsEvent } from "@/lib/ics";

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);

    const contentType = req.headers.get("content-type") || "";
    let rawGalaxyId: string | null = null;
    let icsText = "";
    let memberId: string | null = null;
    let calendarId: string | null = null;
    let deduplicate = true;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawGalaxyId = body.galaxyId || null;
      icsText = body.icsText || body.icsContent || "";
      memberId = body.memberId || null;
      calendarId = body.calendarId || null;
      if (typeof body.deduplicate === "boolean") {
        deduplicate = body.deduplicate;
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      rawGalaxyId = (formData.get("galaxyId") as string) || null;
      memberId = (formData.get("memberId") as string) || null;
      calendarId = (formData.get("calendarId") as string) || null;
      const dedupVal = formData.get("deduplicate");
      if (dedupVal !== null) {
        deduplicate = dedupVal === "true" || dedupVal === "1";
      }
      const file = formData.get("file");
      if (file && typeof file === "object" && "text" in file) {
        icsText = await (file as Blob).text();
      } else {
        icsText = (formData.get("icsText") as string) || "";
      }
    } else if (
      contentType.includes("text/calendar") ||
      contentType.includes("text/plain")
    ) {
      const { searchParams } = new URL(req.url);
      rawGalaxyId = searchParams.get("galaxyId");
      memberId = searchParams.get("memberId");
      calendarId = searchParams.get("calendarId");
      const dedupParam = searchParams.get("deduplicate");
      if (dedupParam !== null) {
        deduplicate = dedupParam !== "false" && dedupParam !== "0";
      }
      icsText = await req.text();
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported Content-Type. Please use application/json, multipart/form-data, or text/calendar.",
        },
        { status: 415 }
      );
    }

    const resolvedGalaxyInput =
      rawGalaxyId || (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!resolvedGalaxyInput) {
      return NextResponse.json(
        { error: "galaxyId is required to import calendar events." },
        { status: 400 }
      );
    }

    if (!icsText || !icsText.trim()) {
      return NextResponse.json(
        { error: "No .ics calendar content provided." },
        { status: 400 }
      );
    }

    // Resolve target galaxy by ID or joinCode
    const normalizedCode = normalizeJoinCode(resolvedGalaxyInput);
    const matchedGalaxies = await db
      .select()
      .from(galaxies)
      .where(
        or(
          eq(galaxies.id, resolvedGalaxyInput),
          eq(galaxies.joinCode, normalizedCode),
          eq(galaxies.joinCode, resolvedGalaxyInput.toUpperCase())
        )
      )
      .limit(1);

    if (matchedGalaxies.length === 0) {
      return NextResponse.json(
        { error: "Calendar Galaxy or Comet not found." },
        { status: 404 }
      );
    }

    const targetGalaxy = matchedGalaxies[0];
    const galaxyId = targetGalaxy.id;

    // Verify actor access with write permissions
    const access = await verifyActorGalaxyAccess(actor, galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You do not have permission to import events into this calendar.",
        },
        { status: access.status || 403 }
      );
    }

    // Parse the RFC 5545 .ics payload
    const parsedCalendar = parseIcsCalendar(icsText);
    if (!parsedCalendar.events || parsedCalendar.events.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid VEVENT records found in the provided .ics content. Please ensure the file contains RFC 5545 calendar events.",
        },
        { status: 400 }
      );
    }

    // If calendarId not specified, find primary calendar for galaxy
    let assignedCalendarId = calendarId;
    if (!assignedCalendarId) {
      const primaryCal = await db
        .select()
        .from(calendars)
        .where(
          and(eq(calendars.galaxyId, galaxyId), eq(calendars.isPrimary, true))
        )
        .limit(1);

      if (primaryCal.length > 0) {
        assignedCalendarId = primaryCal[0].id;
      }
    }

    // Deduplication check against existing galaxy events
    const existingEvents = await db
      .select({
        id: events.id,
        externalUid: events.externalUid,
        title: events.title,
        startTime: events.startTime,
      })
      .from(events)
      .where(eq(events.galaxyId, galaxyId));

    const existingUidSet = new Set(
      existingEvents
        .map((e) => e.externalUid)
        .filter((uid): uid is string => Boolean(uid))
    );
    const existingSigSet = new Set(
      existingEvents.map((e) => `${e.title.trim().toLowerCase()}__${e.startTime}`)
    );

    const memberIdsString = memberId ? JSON.stringify([memberId]) : null;
    const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

    const importedEvents: ParsedIcsEvent[] = [];
    let skippedCount = 0;

    for (const evt of parsedCalendar.events) {
      if (deduplicate) {
        const hasMatchingUid = evt.externalUid && existingUidSet.has(evt.externalUid);
        const hasMatchingSig = existingSigSet.has(
          `${evt.title.trim().toLowerCase()}__${evt.startTime}`
        );

        if (hasMatchingUid || hasMatchingSig) {
          skippedCount++;
          continue;
        }
      }

      const id = crypto.randomUUID();
      const exdatesString =
        evt.exdates && evt.exdates.length > 0
          ? JSON.stringify(evt.exdates)
          : null;
      const organizerString = evt.organizer
        ? JSON.stringify(evt.organizer)
        : null;
      const attendeesString =
        evt.attendees && evt.attendees.length > 0
          ? JSON.stringify(evt.attendees)
          : null;
      const alarmsString =
        evt.alarms && evt.alarms.length > 0
          ? JSON.stringify(evt.alarms)
          : null;

      await db.insert(events).values({
        id,
        galaxyId,
        calendarId: assignedCalendarId,
        memberId: memberId || null,
        memberIds: memberIdsString,
        externalUid: evt.externalUid,
        title: evt.title,
        description: evt.description || null,
        location: evt.location || null,
        startTime: evt.startTime,
        endTime: evt.endTime,
        isAllDay: evt.isAllDay,
        rrule: evt.rrule || null,
        exdates: exdatesString,
        url: evt.url || null,
        status: evt.status || null,
        priority: evt.priority || null,
        transparency: evt.transparency || null,
        classification: evt.classification || null,
        geo: evt.geo || null,
        organizer: organizerString,
        attendees: attendeesString,
        alarms: alarmsString,
        createdByAgentId,
      });

      // Update in-memory sets so duplicates within the same import file are caught
      if (evt.externalUid) existingUidSet.add(evt.externalUid);
      existingSigSet.add(`${evt.title.trim().toLowerCase()}__${evt.startTime}`);

      importedEvents.push(evt);
    }

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      success: true,
      calendarName: parsedCalendar.calendarName || null,
      totalFound: parsedCalendar.events.length,
      importedCount: importedEvents.length,
      skippedCount,
      events: importedEvents,
    });
  } catch (error) {
    console.error("Failed to import .ics events:", error);
    return NextResponse.json(
      { error: "Failed to import calendar events." },
      { status: 500 }
    );
  }
}
