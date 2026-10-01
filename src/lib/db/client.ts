import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// No "server-only" here: scripts (seed, migrate) import this outside Next.js.

export function createDb(url: string, options: postgres.Options<Record<string, never>> = {}) {
  const client = postgres(url, { max: 10, ...options });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, client };
}

export type Db = ReturnType<typeof createDb>["db"];

/** The `tx` handed to `db.transaction(async (tx) => …)`, or anything that can run the same queries. */
export type Executor = Parameters<Parameters<Db["transaction"]>[0]>[0];
