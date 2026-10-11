import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, calendars } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { verifyGalaxyAccess } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const galaxyId = searchParams.get("galaxyId");

    if (!galaxyId) {
      return NextResponse.json(
        { error: "galaxyId is required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      session?.user?.id,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this galaxy's events." },
        { status: 403 }
      );
    }

    const galaxyEvents = await db
      .select()
      .from(events)
      .where(eq(events.galaxyId, galaxyId));

    return NextResponse.json({ events: galaxyEvents });
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
    const body = await req.json();
    const {
      galaxyId,
      calendarId,
      memberId,
      memberIds,
      title,
      description,
      location,
      startTime,
      endTime,
      isAllDay = false,
      rrule,
      exdates,
      colorOverride,
    } = body;

    if (!galaxyId || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "galaxyId, title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const hasAccess = await verifyGalaxyAccess(
      galaxyId,
      session?.user?.id,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to add events to this galaxy." },
        { status: 403 }
      );
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

    const id = crypto.randomUUID();
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
    });

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
    const session = await auth();
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

    const hasAccess = await verifyGalaxyAccess(
      existing[0].galaxyId,
      session?.user?.id,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to edit this event." },
        { status: 403 }
      );
    }

    const updatePayload = { ...updates };
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

    await db.update(events).set(updatePayload).where(eq(events.id, id));

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
    const session = await auth();
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
    const hasAccess = await verifyGalaxyAccess(
      eventRecord.galaxyId,
      session?.user?.id,
      session?.user?.email
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to delete this event." },
        { status: 403 }
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

      return NextResponse.json({
        success: true,
        deletedOccurrence: exdate,
        exdates: currentExdates,
      });
    }

    // Delete entire event / series
    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ success: true, deletedSeries: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
