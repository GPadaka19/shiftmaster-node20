import "server-only";
import { revalidatePath } from "next/cache";

// Pages that show swap requests: both swap pages and the home page (badges).
const SWAP_PATHS = ["/swaps", "/admin/swaps", "/"];
// An admin's decision can exchange seats, so the roster pages too.
const ROSTER_PATHS = ["/roster", "/admin/roster"];

/** Refreshes every page showing swaps after a change; `roster` also refreshes the roster pages. */
export function revalidateSwapViews({ roster = false }: { roster?: boolean } = {}) {
  for (const path of roster ? [...SWAP_PATHS, ...ROSTER_PATHS] : SWAP_PATHS) revalidatePath(path);
}
