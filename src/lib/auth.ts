import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      /*
       * Auth.js's default OAuth behaviour refuses to link a fresh OAuth
       * sign-in to an existing user with the same email — that's an
       * anti-takeover protection for multi-user apps (attacker signs up
       * for OAuth with your email, silently gets access to your account).
       *
       * For this single-user app with an ALLOWED_EMAIL allowlist, the
       * threat is null: only Joel's email is ever accepted through any
       * provider. Enabling this flag lets a fresh GitHub sign-in take
       * over an existing user row created by an earlier auth attempt
       * (originally the Resend magic-link that half-completed and left
       * an orphan `user` row with no linked `account`).
       */
      allowDangerousEmailAccountLinking: true,
    }),
  ],
});
