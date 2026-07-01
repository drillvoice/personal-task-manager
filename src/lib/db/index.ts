import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * postgres.js is created with the DATABASE_URL if set, otherwise a placeholder
 * string. Real connections don't open until the first query, so `next build`'s
 * page-data collection step doesn't crash when env vars aren't wired up yet
 * (e.g. preview deployments before Vercel env is set). Runtime queries will
 * fail loudly if DATABASE_URL is missing — which is the desired behaviour.
 */
const url = process.env.DATABASE_URL ?? "postgres://placeholder@localhost/none";

const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(url, { max: 10, idle_timeout: 20, prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
