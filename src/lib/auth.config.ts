import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. Does NOT import the Drizzle adapter or postgres.js
 * — those don't work on Vercel's edge runtime, and importing them from
 * middleware causes MIDDLEWARE_INVOCATION_TIMEOUT (the 504 we hit earlier).
 *
 * The full config in ./auth.ts extends this with the adapter + providers.
 * Middleware imports THIS file directly.
 */
export const authConfig = {
  pages: { signIn: "/login", verifyRequest: "/login?verify=1" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
      if (!allowed) return false;
      return user.email?.toLowerCase() === allowed;
    },
  },
} satisfies NextAuthConfig;
