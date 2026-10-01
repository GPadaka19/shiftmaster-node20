import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** For the container healthcheck and uptime monitors. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
