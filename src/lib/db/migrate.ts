import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";

/** Applies pending migrations from ./drizzle. Used at server start in production. */
export async function runMigrations(url: string) {
  const { db, client } = createDb(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    await client.end();
  }
}
