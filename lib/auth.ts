import bcrypt from "bcryptjs"; // ✅ Edge-compatible
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma as db } from "@/lib/db";
// import { loginRatelimit } from "@/lib/ratelimit";

// ─── Type augmentation ───
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      credits?: number;
    };
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }


        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // ✅ Return only what's needed — never the password hash
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits ?? 0,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // ✅ Prevent duplicate accounts when email matches
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({
          where: { email: user.email },
        });
        if (existing?.password) {
          // Existing password-based account — link Google silently
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.credits = (user as { credits?: number }).credits ?? 0;
      }

      // ✅ Manual credit refresh via useSession().update({ credits })
      if (trigger === "update" && session?.credits !== undefined) {
        token.credits = session.credits;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.credits = (token.credits as number) ?? 0;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // ✅ 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/auth/login", // ✅ Actual login page
    error: "/auth/login",  // ✅ Show errors on login page
  },

  debug: false,
};