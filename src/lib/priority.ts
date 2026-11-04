export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Wraps a started operation so awaiting it never throws. */
export function settle<T>(operation: Promise<T>): Promise<Outcome<T>> {
  return operation.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}

/** Work on the first eligible slots cannot be displaced by an earlier fetch.
 * Later slots remain lazy so a slow first candidate never causes extra calls. */
export function prefetchEligible<T>(
  loads: Promise<T>[],
  eligible: (value: T) => boolean,
  start: (value: T) => unknown,
  limit = 2,
): Promise<Outcome<T>>[] {
  return loads.map((load, index) =>
    settle(
      load.then((value) => {
        if (index < limit && eligible(value)) start(value);
        return value;
      }),
    ),
  );
}

/** Start useful work while more sources load, retaining cancellation and errors. */
export function startSettled<T>(
  operation: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  const started = Date.now();
  let finished: number | undefined;
  const pending = settle(
    Promise.resolve().then(() => operation(controller.signal)),
  ).then((outcome) => {
    finished = Date.now();
    return outcome;
  });
  return {
    elapsedMs: () => (finished ?? Date.now()) - started,
    async run(signal: AbortSignal): Promise<T> {
      const cancel = () => controller.abort(signal.reason);
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      try {
        const outcome = await pending;
        if (!outcome.ok) throw outcome.error;
        return outcome.value;
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    },
  };
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

/**
 * Runs tasks in parallel. Once a decisive task (an official source) has
 * succeeded, or once every decisive task has finished, the remaining tasks get
 * `graceMs` more and are then aborted. Aborted tasks settle as failures, so the
 * caller keeps reporting them as incomplete. Without decisive tasks the grace
 * starts after the first success.
 */
export async function settleWithGrace<T>(
  tasks: { run: (signal: AbortSignal) => Promise<T>; decisive: boolean }[],
  graceMs: number,
): Promise<{ outcomes: Outcome<T>[]; ms: number[]; cutOff: boolean[] }> {
  const controllers = tasks.map(() => new AbortController());
  const started = Date.now();
  const ms: number[] = tasks.map(() => 0);
  const done = tasks.map(() => false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cut = false;
  const cutOff = tasks.map(() => false);
  const startGrace = () => {
    if (timer || cut) return;
    timer = setTimeout(() => {
      cut = true;
      controllers.forEach((controller, i) => {
        if (done[i]) return;
        cutOff[i] = true;
        controller.abort(new DOMException("grace", "TimeoutError"));
      });
    }, graceMs);
  };
  const anyDecisive = tasks.some((task) => task.decisive);
  const outcomes = await Promise.all(
    tasks.map((task, i) =>
      settle(task.run(controllers[i].signal)).then((outcome) => {
        done[i] = true;
        ms[i] = Date.now() - started;
        const decisiveLeft = tasks.some((t, j) => t.decisive && !done[j]);
        if (
          (outcome.ok && (task.decisive || !anyDecisive)) ||
          (anyDecisive && !decisiveLeft)
        )
          startGrace();
        return outcome;
      }),
    ),
  );
  if (timer) clearTimeout(timer);
  return { outcomes, ms, cutOff };
}
