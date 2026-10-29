import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { galaxies } from "@/db/schema";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { resolveRequestActor, verifyActorGalaxyAccess } from "@/lib/agent-auth";
import {
  parseScreensaverConfig,
  buildImmichUpstreamThumbnailUrl,
  validateGooglePhotosCdnUrl,
} from "@/lib/photos";

const MAX_PROXY_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB safety ceiling for 1080p preview

export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const actor = await resolveRequestActor(request);
    if (actor.kind === "invalid_agent") {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const { searchParams } = new URL(request.url);
    const galaxyId =
      searchParams.get("galaxyId") ||
      (actor.kind === "agent" ? actor.agent.galaxyId : "galaxy_sol_family");
    const assetId = searchParams.get("assetId") || "";
    const gphotoUrl = searchParams.get("u") || "";

    if (!assetId.trim() && !gphotoUrl.trim()) {
      return NextResponse.json(
        { error: "assetId or u query parameter is required" },
        { status: 400 }
      );
    }

    const access = await verifyActorGalaxyAccess(actor, galaxyId, {
      requireWrite: false,
    });
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.error || "You do not have access to this galaxy's photos.",
        },
        { status: access.status || 403 }
      );
    }

    let upstreamUrl = "";
    let upstreamHeaders: Record<string, string> = {
      Accept: "image/webp,image/jpeg,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };

    if (gphotoUrl.trim()) {
      const check = validateGooglePhotosCdnUrl(gphotoUrl);
      if (!check.valid || !check.url) {
        return NextResponse.json(
          { error: check.error || "Invalid Google Photos CDN URL" },
          { status: 400 }
        );
      }
      upstreamUrl = check.url;
    } else {
      const [galaxy] = await db
        .select({
          id: galaxies.id,
          screensaverConfig: galaxies.screensaverConfig,
        })
        .from(galaxies)
        .where(eq(galaxies.id, galaxyId))
        .limit(1);

      if (!galaxy) {
        return NextResponse.json({ error: "Galaxy not found" }, { status: 404 });
      }

      const config = parseScreensaverConfig(galaxy.screensaverConfig);
      const upstream = buildImmichUpstreamThumbnailUrl(config, assetId);
      if (!upstream) {
        return NextResponse.json(
          { error: "Immich connector is not configured or assetId is invalid." },
          { status: 400 }
        );
      }
      upstreamUrl = upstream.url;
      upstreamHeaders = { ...upstreamHeaders, ...upstream.headers };
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: upstreamHeaders,
      referrerPolicy: "no-referrer",
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream photo provider returned HTTP ${upstreamRes.status}` },
        { status: 502 }
      );
    }

    const contentType = (
      upstreamRes.headers.get("content-type") || ""
    ).toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Upstream response is not a valid image" },
        { status: 415 }
      );
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PROXY_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 1080p preview size limit" },
        { status: 413 }
      );
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control":
          "public, max-age=604800, s-maxage=86400, stale-while-revalidate=604800, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to proxy photo preview:", error);
    return NextResponse.json(
      { error: "Failed to proxy photo preview" },
      { status: 502 }
    );
  }
}
