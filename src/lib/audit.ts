import "server-only";
import type { Db } from "@/lib/db/client";
import { db as defaultDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type Executor = Pick<Db, "insert">;

export type AuditEntry = {
  actorId: number | null;
  /** e.g. "member.pin.change" */
  action: string;
  /** e.g. "member:7" */
  subject: string;
  detail?: Record<string, unknown>;
};

/** Records a change. Pass a transaction to keep it atomic with the change. */
export async function writeAudit(entry: AuditEntry, executor: Executor = defaultDb): Promise<void> {
  await executor.insert(auditLog).values(entry);
}
