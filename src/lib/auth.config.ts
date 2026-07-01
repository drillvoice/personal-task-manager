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
    /*
     * With JWT session strategy, Auth.js v5 does not automatically copy
     * user.id onto session.user.id — it has to be threaded through the
     * token manually. Without this, requireUserId() in server components
     * sees an undefined id and bounces to /login, which the middleware
     * then bounces back to /today because the cookie IS valid — that
     * ping-pong is what caused ERR_TOO_MANY_REDIRECTS after sign-in.
     */
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
