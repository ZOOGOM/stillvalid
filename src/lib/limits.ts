// Usage limits in one place. Raised on 2026-11-04 at the user's request while
// the app is being tested (previously 40 / 20 / 12 / 100). The separate Meta
// Billing spend limit remains the money ceiling; these are request ceilings.
// Concurrency (3 slots) and the 10-starts-per-minute burst limit are
// unchanged: they protect the server, not a single tester.

/** Extraction + check starts per network (keyed IP) per hour. */
export const IP_WORK_PER_HOUR = 200;
/** Extractions (including notice location) per anonymous session per hour. */
export const SESSION_EXTRACTIONS_PER_HOUR = 60;
/** Checks per anonymous session per hour. */
export const SESSION_CHECKS_PER_HOUR = 40;
/** Daily model calls when DAILY_MODEL_CALL_LIMIT is not set. */
export const DAILY_MODEL_CALLS_DEFAULT = 300;

export function dailyModelCallLimit(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = Number(env.DAILY_MODEL_CALL_LIMIT || DAILY_MODEL_CALLS_DEFAULT);
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DAILY_MODEL_CALLS_DEFAULT;
}
