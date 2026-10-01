/** True when `error` is Postgres' unique violation (23505) on `constraint`, also when wrapped by Drizzle. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const pg = ((error as { cause?: unknown })?.cause ?? error) as { code?: string; constraint_name?: string };
  return pg?.code === "23505" && pg.constraint_name === constraint;
}
