import test from "node:test";
import assert from "node:assert/strict";
import { settleWithGrace, startSettled } from "../src/lib/priority";

// A task that resolves (or rejects) after `ms` unless its signal aborts first.
function task(ms: number, fail = false) {
  return (signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => (fail ? reject(new Error("failed")) : resolve("done")),
        ms,
      );
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
}

test("an accepted source compares while later fetches wait, without duplicating work", async () => {
  let complete!: (value: string) => void;
  let started = 0;
  const comparison = startSettled(async () => {
    started++;
    return new Promise<string>((resolve) => {
      complete = resolve;
    });
  });
  await Promise.resolve();
  assert.equal(started, 1, "comparison starts before the collection barrier");
  complete("verified");
  const result = await settleWithGrace(
    [{ decisive: true, run: comparison.run }],
    30,
  );
  assert.deepEqual(result.outcomes, [{ ok: true, value: "verified" }]);
  assert.equal(started, 1);
});

test("already started comparisons retain grace cancellation and early failures", async () => {
  const fast = startSettled(task(10));
  const slow = startSettled(task(2000));
  const result = await settleWithGrace(
    [
      { decisive: true, run: fast.run },
      { decisive: false, run: slow.run },
    ],
    30,
  );
  assert.deepEqual(result.cutOff, [false, true]);
  assert.equal(result.outcomes[0].ok, true);
  assert.equal(result.outcomes[1].ok, false);
  const failure = new Error("early failure");
  const failed = startSettled(async () => {
    throw failure;
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await assert.rejects(
    () => failed.run(new AbortController().signal),
    (error) => error === failure,
  );
});

test("after an official comparison succeeds, a slow one gets only the grace period", async () => {
  const started = Date.now();
  const { outcomes, cutOff } = await settleWithGrace(
    [
      { decisive: true, run: task(10) },
      { decisive: false, run: task(2000) },
    ],
    40,
  );
  assert.ok(Date.now() - started < 1000);
  assert.equal(outcomes[0].ok, true);
  assert.equal(outcomes[1].ok, false);
  assert.deepEqual(cutOff, [false, true]);
});

test("a fast failure does not start the grace while an official source is pending", async () => {
  const { outcomes, cutOff } = await settleWithGrace(
    [
      { decisive: true, run: task(5, true) },
      { decisive: true, run: task(150) },
    ],
    20,
  );
  assert.equal(outcomes[0].ok, false);
  assert.equal(outcomes[1].ok, true);
  assert.deepEqual(cutOff, [false, false]);
});

test("without official sources the first success starts the grace; fast tasks are never cut", async () => {
  let r = await settleWithGrace(
    [
      { decisive: false, run: task(10) },
      { decisive: false, run: task(2000) },
    ],
    30,
  );
  assert.deepEqual(r.cutOff, [false, true]);
  r = await settleWithGrace(
    [
      { decisive: true, run: task(10) },
      { decisive: false, run: task(20) },
    ],
    200,
  );
  assert.deepEqual(r.cutOff, [false, false]);
  assert.ok(r.outcomes.every((o) => o.ok));
});
