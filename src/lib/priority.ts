export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Wraps a started operation so awaiting it never throws. */
export function settle<T>(operation: Promise<T>): Promise<Outcome<T>> {
  return operation.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}

/**
 * Consumes already-started operations in priority order, exactly as a
 * sequential loop would decide: it keeps the first `limit` successes and
 * reports only the failures that precede the last kept success. Later
 * operations are neither awaited nor reported.
 */
export async function firstInOrder<T>(
  attempts: Promise<Outcome<T>>[],
  limit: number,
): Promise<{ values: T[]; errors: unknown[] }> {
  const values: T[] = [];
  const errors: unknown[] = [];
  for (const attempt of attempts) {
    if (values.length >= limit) break;
    const outcome = await attempt;
    if (outcome.ok) values.push(outcome.value);
    else errors.push(outcome.error);
  }
  return { values, errors };
}
