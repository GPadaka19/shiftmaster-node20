"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { areas, memberG2Locks, memberPatterns, members, settings, shifts } from "@/lib/db/schema";
import type { FormState } from "@/lib/forms";
import { MAX_G2_DEFAULT_SETTING } from "@/lib/roster/constants";

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

function revalidate() {
  revalidatePath("/admin/rules");
  revalidatePath("/admin/roster");
}

function parseCap(value: FormDataEntryValue | null): number | null | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const cap = Number(text);
  return Number.isInteger(cap) && cap >= 0 && cap <= 5 ? cap : "invalid";
}

export async function saveDefaultMaxG2(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("admin");
  const cap = parseCap(formData.get("maxG2"));
  if (cap === null || cap === "invalid") return { fieldErrors: { maxG2: "Isi angka 0–5." } };

  await db.transaction(async (tx) => {
    await tx
      .insert(settings)
      .values({ key: MAX_G2_DEFAULT_SETTING, value: cap })
      .onConflictDoUpdate({ target: settings.key, set: { value: cap } });
    await writeAudit({ actorId: actor.id, action: "rules.default_g2", subject: `settings:${MAX_G2_DEFAULT_SETTING}`, detail: { value: cap } }, tx);
  });
  revalidate();
  return { success: `Batas G2 default sekarang ${cap} per minggu.` };
}

/**
 * Replaces one member's weekly pattern (shift per weekday, area for studio and
 * PKL), G2 locks and G2 cap. Form fields: shift-1..5 ("" | shift code),
 * area-1..5 (area code, PKL only), lock-1..5 ("on"), maxG2.
 */
export async function saveMemberRules(memberId: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("admin");
  const [[member], lectureShifts, allAreas] = await Promise.all([
    db.select({ pool: members.pool, nickname: members.nickname }).from(members).where(eq(members.id, memberId)),
    db.select().from(shifts).where(eq(shifts.mode, "lecture")),
    db.select().from(areas),
  ]);
  if (!member?.pool) return { error: "Anggota ini tidak masuk roster." };

  const shiftByCode = new Map(lectureShifts.map((s) => [s.code, s.id]));
  const areaByCode = new Map(allAreas.map((a) => [a.code, a]));

  const patterns: (typeof memberPatterns.$inferInsert)[] = [];
  const locks: (typeof memberG2Locks.$inferInsert)[] = [];
  for (const weekday of WEEKDAYS) {
    const shiftCode = String(formData.get(`shift-${weekday}`) ?? "");
    if (!shiftCode) continue;
    const shiftId = shiftByCode.get(shiftCode);
    if (!shiftId) return { error: "Shift tidak dikenal." };

    let areaId: number | null = null;
    if (member.pool === "studio") {
      areaId = areaByCode.get("studio-g2")?.id ?? null;
    } else if (member.pool === "pkl") {
      const area = areaByCode.get(String(formData.get(`area-${weekday}`) ?? ""));
      if (!area || area.kind !== "building") return { error: "PKL perlu gedung di setiap hari kerjanya." };
      areaId = area.id;
    } else if (formData.get(`lock-${weekday}`) === "on") {
      locks.push({ memberId, weekday });
    }
    patterns.push({ memberId, weekday, shiftId, areaId });
  }

  const cap = member.pool === "lab" ? parseCap(formData.get("maxG2")) : null;
  if (cap === "invalid") return { fieldErrors: { maxG2: "Isi angka 0–5, atau kosongkan untuk default." } };
  if (cap === 0 && locks.length > 0) return { error: "Batas G2 = 0 (hanya G7) tidak bisa digabung dengan kunci G2." };

  await db.transaction(async (tx) => {
    await tx.delete(memberPatterns).where(eq(memberPatterns.memberId, memberId));
    await tx.delete(memberG2Locks).where(eq(memberG2Locks.memberId, memberId));
    if (patterns.length) await tx.insert(memberPatterns).values(patterns);
    if (locks.length) await tx.insert(memberG2Locks).values(locks);
    if (member.pool === "lab") await tx.update(members).set({ maxG2PerWeek: cap }).where(eq(members.id, memberId));
    await writeAudit(
      {
        actorId: actor.id,
        action: "rules.member",
        subject: `member:${memberId}`,
        detail: {
          days: patterns.map((p) => p.weekday),
          locks: locks.map((l) => l.weekday),
          maxG2: cap,
        },
      },
      tx,
    );
  });
  revalidate();
  return { success: `Aturan ${member.nickname} disimpan.` };
}
