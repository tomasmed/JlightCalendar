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
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
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
