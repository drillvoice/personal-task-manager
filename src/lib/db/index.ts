import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PgClient = ReturnType<typeof postgres>;

function makeDb(client: PgClient) {
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof makeDb>;

const globalForDb = globalThis as unknown as {
  __pgClient?: PgClient;
  __db?: Db;
};

let productionPgClient: PgClient | undefined;
let productionDb: Db | undefined;

function getPostgresClient(): PgClient {
  if (process.env.NODE_ENV === "production") {
    productionPgClient ??= postgres(getDatabaseUrl(), {
      max: 10,
      idle_timeout: 20,
      prepare: false,
    });
    return productionPgClient;
  }

  globalForDb.__pgClient ??= postgres(getDatabaseUrl(), {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });
  return globalForDb.__pgClient;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://placeholder@localhost/none";
}

export function getDb(): Db {
  if (process.env.NODE_ENV === "production") {
    productionDb ??= makeDb(getPostgresClient());
    return productionDb;
  }

  globalForDb.__db ??= makeDb(getPostgresClient());
  return globalForDb.__db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const database = getDb();
    const value = Reflect.get(database, prop, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export { schema };
