import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

/** Fields an admin can set on a member; PIN and status have their own actions. */
export const memberInputSchema = z
  .object({
    nickname: z.string().trim().min(2, "Nickname minimal 2 huruf.").max(30, "Nickname maksimal 30 huruf."),
    fullName: z.string().trim().min(2, "Isi nama lengkap.").max(100),
    email: z
      .union([z.literal(""), z.email("Format email tidak valid.")])
      .optional()
      .transform((value) => (value ? value.toLowerCase() : null)),
    role: z.enum(["staff", "admin", "superadmin"], { message: "Pilih peran." }),
    pool: z
      .enum(["lab", "studio", "pkl", "none"], { message: "Pilih pool roster." })
      .transform((value) => (value === "none" ? null : value)),
    dutyLabel: optionalText(60),
    startedOn: z
      .union([z.literal(""), z.iso.date("Tanggal tidak valid.")])
      .optional()
      .transform((value) => value || null),
  })
  .refine((member) => member.role === "staff" || member.email !== null, {
    message: "Admin dan superadmin wajib punya email Google.",
    path: ["email"],
  });

export type MemberInput = z.output<typeof memberInputSchema>;

/**
 * A superadmin cannot lock themselves out: no self-demotion, no
 * self-deactivation. Returns the reason, or null when allowed.
 */
export function selfChangeBlocked(
  actorId: number,
  targetId: number,
  change: { role?: string; active?: boolean },
): string | null {
  if (actorId !== targetId) return null;
  if (change.role !== undefined && change.role !== "superadmin") return "Kamu tidak bisa menurunkan peranmu sendiri.";
  if (change.active === false) return "Kamu tidak bisa menonaktifkan akunmu sendiri.";
  return null;
}
