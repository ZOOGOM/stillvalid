import test from "node:test";
import assert from "node:assert/strict";
import Redis from "ioredis-mock";
import { randomUUID } from "node:crypto";
import { RedisStore } from "../src/lib/redis-store";
import { demoResult } from "../src/lib/demo";

// Lua scripts execute against an in-memory Redis emulator; no external account is used.
const client = new Redis();
const command = async (...args: (string | number)[]): Promise<unknown> => {
  const methods = client as unknown as Record<
    string,
    (...values: (string | number)[]) => Promise<unknown>
  >;
  return await methods[String(args[0]).toLowerCase()].apply(
    client,
    args.slice(1),
  );
};
const store = new RedisStore(command);
test.afterEach(async () => {
  await client.flushall();
});
test.after(() => client.disconnect());
test("serverless idempotency is shared between independent adapter instances", async () => {
  const second = new RedisStore(command),
    key = randomUUID();
  const results = await Promise.all([
    store.createCheck("a", key),
    second.createCheck("a", key),
  ]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(results.filter((r) => r.existing).length, 1);
});
test("serverless data cannot be read or deleted by another actor", async () => {
  const job = await store.createCheck("a", randomUUID());
  await assert.rejects(() => store.getCheck(job.id, "b"), {
    code: "not_found",
  });
  await store.deleteCheck(job.id, "b");
  assert.equal((await store.getCheck(job.id, "a")).state, "processing");
});
test("serverless completion cannot resurrect a deleted job", async () => {
  const job = await store.createCheck("a", randomUUID());
  await store.deleteCheck(job.id, "a");
  await store.finishCheck(job.id, "a", demoResult("deadline", "en"));
  await assert.rejects(() => store.getCheck(job.id, "a"), {
    code: "not_found",
  });
});
test("serverless completion retains an expiring readable result", async () => {
  const job = await store.createCheck("a", randomUUID()),
    result = demoResult("deadline", "en");
  await store.finishCheck(job.id, "a", result);
  assert.deepEqual((await store.getCheck(job.id, "a")).result, result);
  const ttl = await client.ttl(store.key("check:" + job.id));
  assert.ok(ttl > 0 && ttl <= 86400);
});
test("serverless concurrency lease is released after failure", async () => {
  const jobs = await Promise.all(
    [0, 1, 2].map((i) => store.createCheck(String(i), randomUUID())),
  );
  await assert.rejects(() => store.createCheck("fourth", randomUUID()), {
    code: "busy",
  });
  await store.failCheck(jobs[0].id, "0");
  await store.createCheck("fourth", randomUUID());
});
test("serverless session-wide deletion preserves other actors", async () => {
  const a = await store.createCheck("a", randomUUID()),
    b = await store.createCheck("b", randomUUID());
  await store.deleteAllChecks("a");
  await assert.rejects(() => store.getCheck(a.id, "a"));
  assert.equal((await store.getCheck(b.id, "b")).state, "processing");
});
test("serverless quota increments atomically and rejects excess requests", async () => {
  await store.reserve("quota", 2, 3600000);
  await store.reserve("quota", 2, 3600000);
  await assert.rejects(() => store.reserve("quota", 2, 3600000), {
    code: "rate_limit",
  });
});
