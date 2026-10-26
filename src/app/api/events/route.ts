import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, calendars } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
  getGalaxyAgentMap,
} from "@/lib/agent-auth";
import { ensureDatabaseSchema } from "@/db/ensure-schema";

export async function GET(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);
    const rawGalaxyId = searchParams.get("galaxyId");

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!galaxyId) {
      return NextResponse.json(
        { error: "galaxyId is required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have access to this galaxy's events." },
        { status: access.status || 403 }
      );
    }

    const galaxyEvents = await db
      .select()
      .from(events)
      .where(eq(events.galaxyId, galaxyId));

    // O(1) enrichment with agent badge metadata
    const agentMap = await getGalaxyAgentMap(galaxyId);
    const enrichedEvents = galaxyEvents.map((evt) => ({
      ...evt,
      agent: evt.createdByAgentId ? agentMap.get(evt.createdByAgentId) || null : null,
    }));

    return NextResponse.json({ events: enrichedEvents });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const body = await req.json();

    const {
      galaxyId: rawGalaxyId,
      calendarId,
      memberId: rawMemberId,
      memberIds: rawMemberIds,
      title,
      description,
      location,
      startTime,
      endTime,
      isAllDay = false,
      rrule,
      exdates,
      colorOverride,
      url,
      status: eventStatus,
      priority,
      transparency,
      classification,
      geo,
      organizer,
      attendees,
      alarms,
    } = body;

    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : null);

    if (!galaxyId || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "galaxyId, title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId, { requireWrite: true });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to add events to this galaxy." },
        { status: access.status || 403 }
      );
    }

    // Default inhabitant attribution for agents:
    // If agent omits both memberId AND memberIds, default to bound Inhabitant.
    // If memberId: null was explicitly passed (whole-family), respect that!
    let memberId = rawMemberId;
    let memberIds = rawMemberIds;
    if (
      actor.kind === "agent" &&
      rawMemberId === undefined &&
      rawMemberIds === undefined
    ) {
      memberId = actor.agent.memberId;
      memberIds = [actor.agent.memberId];
    }

    // If calendarId not specified, find the primary calendar for the galaxy
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

    const memberIdsString = Array.isArray(memberIds)
      ? JSON.stringify(memberIds)
      : typeof memberIds === "string"
      ? memberIds
      : memberId
      ? JSON.stringify([memberId])
      : null;

    const exdatesString = Array.isArray(exdates)
      ? JSON.stringify(exdates)
      : typeof exdates === "string"
      ? exdates
      : null;

    const organizerString = organizer
      ? typeof organizer === "string"
        ? organizer
        : JSON.stringify(organizer)
      : null;
    const attendeesString = attendees
      ? typeof attendees === "string"
        ? attendees
        : JSON.stringify(attendees)
      : null;
    const alarmsString = alarms
      ? typeof alarms === "string"
        ? alarms
        : JSON.stringify(alarms)
      : null;

    const id = crypto.randomUUID();
    const createdByAgentId = actor.kind === "agent" ? actor.agent.id : null;

    await db.insert(events).values({
      id,
      galaxyId,
      calendarId: assignedCalendarId,
      memberId: memberId || null,
      memberIds: memberIdsString,
      title,
      description: description || null,
      location: location || null,
      startTime,
      endTime,
      isAllDay: Boolean(isAllDay),
      rrule: rrule || null,
      exdates: exdatesString,
      colorOverride: colorOverride || null,
      url: url || null,
      status: eventStatus || null,
      priority: typeof priority === "number" ? priority : null,
      transparency: transparency || null,
      classification: classification || null,
      geo: geo || null,
      organizer: organizerString,
      attendees: attendeesString,
      alarms: alarmsString,
      createdByAgentId,
    });

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      success: true,
      event: {
        id,
        galaxyId,
        calendarId: assignedCalendarId,
        memberId: memberId || null,
        memberIds: memberIdsString,
        title,
        description,
        location,
        startTime,
        endTime,
        isAllDay,
        rrule: rrule || null,
        exdates: exdatesString,
        colorOverride,
        createdByAgentId,
        agent: actor.kind === "agent" ? actor.agent : null,
      },
    });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const access = await verifyActorGalaxyAccess(actor, existing[0].galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to edit this event." },
        { status: access.status || 403 }
      );
    }

    // Whitelist allowed mutable fields (prevents agent badge object or arbitrary columns from breaking update)
    const updatePayload: Record<string, any> = {};
    const allowedKeys = [
      "calendarId",
      "memberId",
      "memberIds",
      "title",
      "description",
      "location",
      "startTime",
      "endTime",
      "isAllDay",
      "rrule",
      "exdates",
      "colorOverride",
      "url",
      "status",
      "priority",
      "transparency",
      "classification",
      "geo",
      "organizer",
      "attendees",
      "alarms",
    ];

    for (const key of allowedKeys) {
      if (key in updates) {
        updatePayload[key] = updates[key];
      }
    }

    if ("memberIds" in updatePayload) {
      if (Array.isArray(updatePayload.memberIds)) {
        updatePayload.memberIds = JSON.stringify(updatePayload.memberIds);
      } else if (typeof updatePayload.memberIds !== "string" && updatePayload.memberIds !== null) {
        updatePayload.memberIds = null;
      }
    }

    if ("exdates" in updatePayload) {
      if (Array.isArray(updatePayload.exdates)) {
        updatePayload.exdates = JSON.stringify(updatePayload.exdates);
      } else if (typeof updatePayload.exdates !== "string" && updatePayload.exdates !== null) {
        updatePayload.exdates = null;
      }
    }

    if ("organizer" in updatePayload && typeof updatePayload.organizer === "object" && updatePayload.organizer !== null) {
      updatePayload.organizer = JSON.stringify(updatePayload.organizer);
    }

    if ("attendees" in updatePayload && Array.isArray(updatePayload.attendees)) {
      updatePayload.attendees = JSON.stringify(updatePayload.attendees);
    }

    if ("alarms" in updatePayload && Array.isArray(updatePayload.alarms)) {
      updatePayload.alarms = JSON.stringify(updatePayload.alarms);
    }

    if (actor.kind === "agent") {
      updatePayload.createdByAgentId = actor.agent.id;
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.update(events).set(updatePayload).where(eq(events.id, id));
    }

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const exdate = searchParams.get("exdate"); // YYYY-MM-DD for single occurrence deletion

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventRecord = existing[0];
    const access = await verifyActorGalaxyAccess(actor, eventRecord.galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || "You do not have permission to delete this event." },
        { status: access.status || 403 }
      );
    }

    // Single occurrence deletion for recurring event
    if (exdate && eventRecord.rrule) {
      let currentExdates: string[] = [];
      if (eventRecord.exdates) {
        try {
          const parsed = JSON.parse(eventRecord.exdates);
          if (Array.isArray(parsed)) currentExdates = parsed;
          else currentExdates = [String(eventRecord.exdates)];
        } catch {
          currentExdates = eventRecord.exdates.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      if (!currentExdates.includes(exdate)) {
        currentExdates.push(exdate);
      }

      await db
        .update(events)
        .set({ exdates: JSON.stringify(currentExdates) })
        .where(eq(events.id, id));

      if (actor.kind === "agent") {
        await recordAgentAction(actor.agent.id);
      }

      return NextResponse.json({
        success: true,
        deletedOccurrence: exdate,
        exdates: currentExdates,
      });
    }

    // Delete entire event / series
    await db.delete(events).where(eq(events.id, id));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({ success: true, deletedSeries: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
