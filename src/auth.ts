import crypto from "crypto";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  galaxies,
  galaxyMembers,
  calendars,
  generateJoinCode,
} from "@/db/schema";
import { eq } from "drizzle-orm";

import { ensureDbUser } from "@/lib/auth-helpers";

export interface MockTestSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

let mockTestSession: MockTestSession | null | undefined = undefined;

/**
 * Sets a mocked session for automated system tests.
 * Strictly restricted to JLIGHT_TEST_MODE="true".
 */
export function setMockTestSession(session: MockTestSession | null | undefined) {
  if (process.env.JLIGHT_TEST_MODE !== "true") {
    throw new Error("setMockTestSession is only permitted when JLIGHT_TEST_MODE=true");
  }
  mockTestSession = session;
}

/**
 * Resolves the NextAuth signing secret safely:
 * - Uses AUTH_SECRET or NEXTAUTH_SECRET when configured.
 * - In development or JLIGHT_TEST_MODE, allows a deterministic local dev secret.
 * - In production, never falls back to a static public string; generates a random
 *   CSPRNG secret per process if unconfigured so external attackers cannot forge JWTs.
 */
export function resolveAuthSecret(
  env: Record<string, string | undefined> = process.env
): string {
  const configured = env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (env.NODE_ENV !== "production" || env.JLIGHT_TEST_MODE === "true") {
    return "jlight-dev-only-secret-not-for-production";
  }

  console.warn(
    "⚠️ [JlightCalendar Security] AUTH_SECRET is not set in production! Generating ephemeral CSPRNG secret."
  );
  return crypto.randomBytes(32).toString("hex");
}

const nextAuth = NextAuth({
  trustHost: true,
  secret: resolveAuthSecret(),
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        process.env.AUTH_GOOGLE_ID ||
        "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET ||
        "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.email) {
        try {
          const dbUserId = await ensureDbUser({
            id: (token.id as string) || (token.sub as string),
            email: token.email as string,
            name: (token.name as string) || (user?.name as string),
            image: (token.picture as string) || (user?.image as string),
          });
          if (dbUserId) {
            token.id = dbUserId;
          }
        } catch (e) {
          console.error("Failed to sync DB user in jwt callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      } else if (token?.sub) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const galaxyId = crypto.randomUUID();
      const galaxyName = user.name
        ? `${user.name}'s Family Galaxy`
        : "My Family Galaxy";

      // 1. Provision default Galaxy
      await db.insert(galaxies).values({
        id: galaxyId,
        name: galaxyName,
        ownerId: user.id,
        theme: "milky-way",
        icon: "sparkles",
        joinCode: generateJoinCode(),
      });

      // 2. Add user as owner member
      await db.insert(galaxyMembers).values({
        id: crypto.randomUUID(),
        galaxyId,
        userId: user.id,
        displayName: user.name || "Owner",
        role: "owner",
        color: "#ec4899",
        avatarIcon: "user",
      });

      // 3. Create default Primary Orbit Calendar
      await db.insert(calendars).values({
        id: crypto.randomUUID(),
        galaxyId,
        name: "Primary Orbit",
        isPrimary: true,
        color: "#8b5cf6",
      });

      // 4. Update user's default Galaxy
      await db
        .update(users)
        .set({ defaultGalaxyId: galaxyId })
        .where(eq(users.id, user.id));
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export const auth: typeof nextAuth.auth = ((...args: any[]) => {
  if (process.env.JLIGHT_TEST_MODE === "true" && mockTestSession !== undefined) {
    return Promise.resolve(mockTestSession as any);
  }
  return (nextAuth.auth as any)(...args);
}) as typeof nextAuth.auth;
