import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { users, galaxies, galaxyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Ensures a user record exists in the SQLite users table for foreign key integrity.
 * If the user logged in via OAuth or JWT, this guarantees that galaxies.ownerId and
 * galaxyMembers.userId references will succeed.
 */
export async function ensureDbUser(sessionUser?: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
} | null): Promise<string | null> {
  await ensureDatabaseSchema();
  if (!sessionUser) return null;
  const email = sessionUser.email;
  const id = sessionUser.id;

  if (!email && !id) return null;

  try {
    // 1. Check if user exists by email
    if (email) {
      const byEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (byEmail.length > 0) {
        return byEmail[0].id;
      }
    }

    // 2. Check if user exists by ID
    if (id) {
      const byId = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (byId.length > 0) {
        return byId[0].id;
      }
    }

    // 3. Not in database yet -> insert user
    const newId = id || crypto.randomUUID();
    await db.insert(users).values({
      id: newId,
      email: email || `${newId}@jlight.local`,
      name: sessionUser.name || "Captain",
      image: sessionUser.image || null,
    });
    return newId;
  } catch (err) {
    console.error("Error in ensureDbUser:", err);
    if (email) {
      const retry = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (retry.length > 0) return retry[0].id;
    }
    return id || null;
  }
}

/**
 * Checks whether a given user has access to view/modify a galaxy's data.
 * Public demo galaxies are accessible for sandbox preview.
 * All user-owned or private galaxies strictly require ownership or membership.
 */
export async function verifyGalaxyAccess(
  galaxyId: string,
  userId?: string | null,
  userEmail?: string | null
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

  let dbUserId = userId;

  // Resolve DB user id if email is available and userId is not found in DB
  if (userEmail && (!dbUserId || dbUserId.length < 10)) {
    try {
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);
      if (dbUser.length > 0) {
        dbUserId = dbUser[0].id;
      }
    } catch {
      // Ignore
    }
  }

  if (!dbUserId) {
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

  if (galaxy[0].ownerId === dbUserId) {
    return true;
  }

  // Check if active member
  const membership = await db
    .select()
    .from(galaxyMembers)
    .where(
      and(
        eq(galaxyMembers.galaxyId, galaxyId),
        eq(galaxyMembers.userId, dbUserId)
      )
    )
    .limit(1);

  return membership.length > 0;
}
