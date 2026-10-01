import { z } from "zod";

/** Empty strings in .env files count as "not set". */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const schema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL belum diisi"),
  GOOGLE_CLIENT_ID: optional,
  BOOTSTRAP_SUPERADMIN_EMAIL: optional,
  BOOTSTRAP_SUPERADMIN_NICKNAME: optional,
  RUN_MIGRATIONS: optional.transform((value) => value === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so `next build` does not need runtime secrets. */
export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
