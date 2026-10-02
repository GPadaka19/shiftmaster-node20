import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { getModeOn } from "@/lib/period/queries";
import { copyWeek, generateWeek, getWeekRecord, RosterError } from "@/lib/roster/service";
import { addDaysIso, todayIso, weekStartIso } from "@/lib/time";

// Called every Friday 17:30 WIB by the Coolify scheduled task "weekly-roster",
// from inside the app container (docs/GO-LIVE.md section 5):
//   wget -qO- --header "Authorization: Bearer $CRON_SECRET" --post-data "" http://127.0.0.1:3000/api/cron/weekly-roster
//
// Makes next week's roster if it does not exist yet, and publishes it, so staff
// always have one. Admins can still change it afterwards. A roster an admin
// already made (draft or published) is never touched.

function sameSecret(given: string, expected: string): boolean {
  // Hash first so the comparison is constant-time even for different lengths.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) return Response.json({ status: "disabled", error: "CRON_SECRET belum diatur." }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || !sameSecret(header.slice("Bearer ".length), secret)) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }

  const thisWeek = weekStartIso(todayIso());
  const nextWeek = addDaysIso(thisWeek, 7);

  const existing = await getWeekRecord(nextWeek);
  if (existing) return Response.json({ status: "exists", weekStart: nextWeek, rosterStatus: existing.status });

  try {
    if ((await getModeOn(nextWeek)).mode === "lecture") {
      const { warnings } = await generateWeek(nextWeek, { actorId: null, publish: true });
      return Response.json({ status: "generated", weekStart: nextWeek, warnings });
    }

    // Break weeks keep the current roster, as the old app did.
    if (!(await getWeekRecord(thisWeek))) {
      return Response.json({ status: "skipped", weekStart: nextWeek, reason: "Tidak ada roster minggu ini untuk disalin." });
    }
    await copyWeek(thisWeek, nextWeek, { actorId: null, publish: true });
    return Response.json({ status: "copied", weekStart: nextWeek });
  } catch (error) {
    if (error instanceof RosterError) {
      console.error(`[cron] weekly roster for ${nextWeek} failed: ${error.message}`);
      return Response.json({ status: "failed", weekStart: nextWeek, error: error.message }, { status: 422 });
    }
    throw error;
  }
}
