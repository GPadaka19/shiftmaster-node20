import { z } from "zod";
import { ACTIVITY_BATCH_MAX, ACTIVITY_LABEL_MAX, ACTIVITY_PATH_MAX } from "@/lib/activity/constants";
import { cleanLabel, normalizePath } from "@/lib/activity/label";
import { recordBrowserEvents } from "@/lib/activity/record";
import { getCurrentMember } from "@/lib/auth/session";

// Receives page views and button presses from <ActivityTracker>. proxy.ts skips
// /api/, so the session is checked here; who the events belong to always comes
// from the session, never from the request body.

const bodySchema = z.object({
  events: z
    .array(
      z.object({
        kind: z.enum(["page_view", "click"]),
        label: z.string().min(1).max(ACTIVITY_LABEL_MAX * 2),
        path: z.string().startsWith("/").max(ACTIVITY_PATH_MAX * 2),
      }),
    )
    .min(1)
    .max(ACTIVITY_BATCH_MAX),
});

export async function POST(request: Request) {
  // Browsers send this header themselves; another site cannot post on a member's behalf.
  if (request.headers.get("sec-fetch-site") !== "same-origin") return new Response(null, { status: 403 });

  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  await recordBrowserEvents(
    member.id,
    parsed.data.events.map((event) => {
      const path = normalizePath(event.path);
      return { kind: event.kind, path, label: event.kind === "page_view" ? path : cleanLabel(event.label) };
    }),
  );
  return new Response(null, { status: 204 });
}
