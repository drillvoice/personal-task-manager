import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/*
 * Queries run over Neon's HTTP endpoint (one fetch per statement) instead of
 * a TCP postgres.js pool — no TLS/connection handshake on serverless cold
 * starts. Interactive transactions are not supported over HTTP; nothing in
 * the app uses db.transaction. CLI scripts (src/db/migrate.ts, seed.ts) keep
 * postgres.js since they run locally over TCP.
 */
function makeDb() {
  return drizzle(neon(getDatabaseUrl()), { schema });
}

type Db = ReturnType<typeof makeDb>;

const globalForDb = globalThis as unknown as {
  __db?: Db;
};

let productionDb: Db | undefined;

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://placeholder@localhost/none";
}

export function getDb(): Db {
  if (process.env.NODE_ENV === "production") {
    productionDb ??= makeDb();
    return productionDb;
  }

  globalForDb.__db ??= makeDb();
  return globalForDb.__db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const database = getDb();
    const value = Reflect.get(database, prop, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

/**
 * Postgres unique-violation (SQLSTATE 23505). The Neon driver surfaces the
 * SQLSTATE on the thrown error's `code`. Lets an action distinguish a lost
 * insert race (two concurrent writes to the same slot) from a real failure.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

export { schema };
