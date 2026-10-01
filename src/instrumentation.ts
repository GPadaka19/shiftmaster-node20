export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.RUN_MIGRATIONS !== "true") return;

  // Production start: bring the schema up to date, then make sure the
  // configuration rows, the first superadmin and the starting team exist.
  const { env } = await import("./lib/env");
  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations(env().DATABASE_URL);
  console.info("[db] migrations applied");

  const { createDb } = await import("./lib/db/client");
  const { seedConfiguration, seedMembers, seedSuperadmin } = await import("./lib/db/bootstrap");
  const { db, client } = createDb(env().DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await seedConfiguration(db);
    await seedSuperadmin(db, { email: env().BOOTSTRAP_SUPERADMIN_EMAIL, nickname: env().BOOTSTRAP_SUPERADMIN_NICKNAME });
    await seedMembers(db);
  } finally {
    await client.end();
  }
}
