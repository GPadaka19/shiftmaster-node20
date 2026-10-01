export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.RUN_MIGRATIONS !== "true") return;

  const { runMigrations } = await import("./lib/db/migrate");
  const { env } = await import("./lib/env");
  await runMigrations(env().DATABASE_URL);
  console.info("[db] migrations applied");
}
