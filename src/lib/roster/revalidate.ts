import "server-only";
import { revalidatePath } from "next/cache";

/** Pages that show a roster: refresh them after any roster change. */
const ROSTER_PATHS = ["/admin/roster", "/roster", "/"] as const;

export function revalidateRosterViews() {
  for (const path of ROSTER_PATHS) revalidatePath(path);
}
