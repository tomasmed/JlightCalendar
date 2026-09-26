import { db } from "@/db";
import { galaxies, galaxyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Checks whether a given user has access to view/modify a galaxy's data.
 * Public demo galaxies are accessible for sandbox preview.
 * All user-owned or private galaxies strictly require ownership or membership.
 */
export async function verifyGalaxyAccess(
  galaxyId: string,
  userId?: string | null
): Promise<boolean> {
  if (!galaxyId) return false;

  // Sandbox demo galaxies are viewable in demo mode
  const demoGalaxies = new Set([
    "galaxy_sol_family",
    "galaxy_grandparents",
    "galaxy_kids_orbit",
  ]);
  if (demoGalaxies.has(galaxyId)) {
    return true;
  }

  if (!userId) {
    return false;
  }

  // Check if owner
  const galaxy = await db
    .select()
    .from(galaxies)
    .where(eq(galaxies.id, galaxyId))
    .limit(1);

  if (galaxy.length === 0) {
    return false;
  }

  if (galaxy[0].ownerId === userId) {
    return true;
  }

  // Check if active member
  const membership = await db
    .select()
    .from(galaxyMembers)
    .where(
      and(
        eq(galaxyMembers.galaxyId, galaxyId),
        eq(galaxyMembers.userId, userId)
      )
    )
    .limit(1);

  return membership.length > 0;
}
