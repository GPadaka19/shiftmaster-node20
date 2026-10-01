import "server-only";
import { env } from "@/lib/env";
import { createDb, type Db } from "./client";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { shiftmasterDb?: Db };

function getDb(): Db {
  globalForDb.shiftmasterDb ??= createDb(env().DATABASE_URL).db;
  return globalForDb.shiftmasterDb;
}

/** Lazily connects on first use, so importing this module needs no env. */
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
