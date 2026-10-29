import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { galaxies } from "@/db/schema";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import {
  resolveRequestActor,
  verifyActorGalaxyAccess,
  recordAgentAction,
} from "@/lib/agent-auth";
import {
  parseScreensaverConfig,
  maskScreensaverConfig,
  mergeScreensaverConfigUpdate,
  validateGooglePhotosShareUrl,
  validateExternalConnectorUrl,
  parseImmichShareLink,
  resolveConnectorPhotos,
} from "@/lib/photos";

async function ensureGalaxyOrDemoRow(galaxyId: string) {
  let [galaxy] = await db
    .select({
      id: galaxies.id,
      screensaverConfig: galaxies.screensaverConfig,
    })
    .from(galaxies)
    .where(eq(galaxies.id, galaxyId))
    .limit(1);

  if (!galaxy && galaxyId === "galaxy_sol_family") {
    try {
      await db
        .insert(galaxies)
        .values({
          id: "galaxy_sol_family",
          name: "The Sol Family Galaxy",
          slug: "sol-family",
          theme: "milky-way",
          icon: "sparkles",
          parentPin: "1234",
          timezone: "America/New_York",
          joinCode: "SOL-HOME1",
        })
        .onConflictDoNothing();

      [galaxy] = await db
        .select({
          id: galaxies.id,
          screensaverConfig: galaxies.screensaverConfig,
        })
        .from(galaxies)
        .where(eq(galaxies.id, galaxyId))
        .limit(1);
    } catch {
      // Ignore concurrent insert race
    }
  }

  return galaxy;
}

export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    if (actor.kind === "invalid_agent") {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const { searchParams } = new URL(request.url);
    const rawGalaxyId = searchParams.get("galaxyId");
    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    const access = await verifyActorGalaxyAccess(actor, galaxyId, {
      requireWrite: false,
    });
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You do not have access to this galaxy's photo screensaver.",
        },
        { status: access.status || 403 }
      );
    }

    const galaxy = await ensureGalaxyOrDemoRow(galaxyId);
    if (!galaxy) {
      return NextResponse.json({ error: "Galaxy not found" }, { status: 404 });
    }

    const config = parseScreensaverConfig(galaxy.screensaverConfig);
    const resolved = await resolveConnectorPhotos(galaxyId, config);

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    return NextResponse.json({
      config: maskScreensaverConfig(config),
      photos: resolved.photos,
      source: resolved.source,
      warning: resolved.warning,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load screensaver photos:", error);
    return NextResponse.json(
      { error: "Failed to load screensaver photos" },
      { status: 500 }
    );
  }
}

async function handleSaveScreensaverConfig(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    if (actor.kind === "invalid_agent") {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const body = await request.json();
    const rawGalaxyId = body.galaxyId;
    const galaxyId =
      rawGalaxyId ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");

    const access = await verifyActorGalaxyAccess(actor, galaxyId, {
      requireWrite: true,
    });
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error ||
            "You do not have permission to update screensaver settings for this galaxy.",
        },
        { status: access.status || 403 }
      );
    }

    const galaxy = await ensureGalaxyOrDemoRow(galaxyId);
    if (!galaxy) {
      return NextResponse.json({ error: "Galaxy not found" }, { status: 404 });
    }

    const existingConfig = parseScreensaverConfig(galaxy.screensaverConfig);
    const incomingConfig =
      body.config && typeof body.config === "object" ? body.config : body;
    const updatedConfig = mergeScreensaverConfigUpdate(
      existingConfig,
      incomingConfig
    );

    // Validate provider-specific URLs before persisting
    if (updatedConfig.provider === "google_photos") {
      const check = validateGooglePhotosShareUrl(
        updatedConfig.googlePhotosShareUrl
      );
      if (!check.valid) {
        return NextResponse.json(
          { error: check.error || "Invalid Google Photos shared album link." },
          { status: 400 }
        );
      }
      updatedConfig.googlePhotosShareUrl =
        check.normalizedUrl || updatedConfig.googlePhotosShareUrl;
    } else if (updatedConfig.provider === "immich") {
      const hasShare = Boolean(updatedConfig.immichShareUrl?.trim());
      const hasBase = Boolean(updatedConfig.immichBaseUrl?.trim());
      if (!hasShare && !hasBase) {
        return NextResponse.json(
          {
            error:
              "Please enter either an Immich Shared Album Link or an Immich Web Address.",
          },
          { status: 400 }
        );
      }
      if (hasShare) {
        const shareCheck = parseImmichShareLink(updatedConfig.immichShareUrl);
        if (!shareCheck.valid) {
          return NextResponse.json(
            { error: shareCheck.error || "Invalid Immich shared link." },
            { status: 400 }
          );
        }
      }
      if (hasBase) {
        const baseCheck = validateExternalConnectorUrl(
          updatedConfig.immichBaseUrl
        );
        if (!baseCheck.valid) {
          return NextResponse.json(
            { error: baseCheck.error || "Invalid Immich server URL." },
            { status: 400 }
          );
        }
      }
    }

    // Persist only the compact config JSON in Turso (zero per-photo rows or image blobs)
    const serialized = JSON.stringify({
      ...updatedConfig,
      hasImmichApiKey: undefined,
    });

    await db
      .update(galaxies)
      .set({ screensaverConfig: serialized })
      .where(eq(galaxies.id, galaxyId));

    if (actor.kind === "agent") {
      await recordAgentAction(actor.agent.id);
    }

    const resolved = await resolveConnectorPhotos(galaxyId, updatedConfig);

    return NextResponse.json({
      success: true,
      config: maskScreensaverConfig(updatedConfig),
      photos: resolved.photos,
      source: resolved.source,
      warning: resolved.warning,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save screensaver config:", error);
    return NextResponse.json(
      { error: "Failed to save screensaver configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return handleSaveScreensaverConfig(request);
}

export async function POST(request: Request) {
  return handleSaveScreensaverConfig(request);
}
