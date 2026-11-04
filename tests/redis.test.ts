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
test("serverless concurrency lease is released only when the runner ends", async () => {
  const jobs = await Promise.all(
    [0, 1, 2].map((i) => store.createCheck(String(i), randomUUID())),
  );
  await assert.rejects(() => store.createCheck("fourth", randomUUID()), {
    code: "busy",
  });
  await store.failCheck(jobs[0].id, "0");
  await assert.rejects(() => store.createCheck("fourth", randomUUID()), {
    code: "busy",
  });
  await store.releaseWork(jobs[0].id, "0");
  await store.createCheck("fourth", randomUUID());
});
test("serverless session-wide deletion preserves other actors", async () => {
  const a = await store.createCheck("a", randomUUID()),
    b = await store.createCheck("b", randomUUID());
  await store.deleteAllChecks("a");
  await assert.rejects(() => store.getCheck(a.id, "a"));
  assert.equal((await store.getCheck(b.id, "b")).state, "processing");
});
test("deletion retains active idempotency until the runner ends", async () => {
  for (const deleteAll of [false, true]) {
    const key = randomUUID();
    const first = await store.createCheck("a", key);
    if (deleteAll) await store.deleteAllChecks("a");
    else await store.deleteCheck(first.id, "a");
    assert.equal((await store.createCheck("a", key)).existing, true);
    await store.releaseWork(first.id, "a");
    const next = await store.createCheck("a", key);
    assert.equal(next.existing, false);
    assert.notEqual(next.id, first.id);
    await store.failCheck(next.id, "a");
    await store.releaseWork(next.id, "a");
  }
});
test("a stale idempotency mapping left by an older deletion is repaired", async () => {
  const key = randomUUID(),
    oldId = randomUUID();
  await client.set(store.key("idem:a:" + key), oldId, "EX", 86400);
  const next = await store.createCheck("a", key);
  assert.equal(next.existing, false);
  assert.notEqual(next.id, oldId);
  assert.equal((await store.getCheck(next.id, "a")).state, "processing");
});
test("serverless quota increments atomically and rejects excess requests", async () => {
  await store.reserve("quota", 2, 3600000);
  await store.reserve("quota", 2, 3600000);
  await assert.rejects(() => store.reserve("quota", 2, 3600000), {
    code: "rate_limit",
  });
});

for (const all of [false, true]) {
  test(`legacy ${all ? "session-wide" : "single"} deletion cannot release v2 execution or request-key leases`, async () => {
    const requestKey = randomUUID();
    const first = await store.createCheck("a", requestKey);
    await store.createCheck("a", randomUUID());
    await store.createCheck("b", randomUUID());
    // Execute the previous deployed deletion scripts against the original keys.
    if (all) {
      await command(
        "EVAL",
        `local ids=redis.call('SMEMBERS',KEYS[1]);for _,id in ipairs(ids) do local key=ARGV[2]..id;if redis.call('HGET',key,'owner')==ARGV[1] then local request=redis.call('HGET',key,'request_key');if request then local idem=ARGV[3]..request;if redis.call('GET',idem)==id then redis.call('DEL',idem) end;end;redis.call('DEL',key);redis.call('ZREM',KEYS[2],id);end;end;redis.call('DEL',KEYS[1]);return 1`,
        2,
        store.key("owner:a"),
        store.key("active"),
        "a",
        store.key("check:"),
        store.key("idem:a:"),
      );
    } else {
      await command(
        "EVAL",
        `if redis.call('HGET',KEYS[1],'owner')~=ARGV[1] then return 0 end;local request=redis.call('HGET',KEYS[1],'request_key');if request then local idem=ARGV[3]..request;if redis.call('GET',idem)==ARGV[2] then redis.call('DEL',idem) end;end;redis.call('DEL',KEYS[1]);redis.call('ZREM',KEYS[2],ARGV[2]);redis.call('SREM',KEYS[3],ARGV[2]);return 1`,
        3,
        store.key("check:" + first.id),
        store.key("active"),
        store.key("owner:a"),
        "a",
        first.id,
        store.key("idem:a:"),
      );
    }
    await client.del(store.key("idem:a:" + requestKey));
    await assert.rejects(() => store.getCheck(first.id, "a"), {
      code: "not_found",
    });
    await assert.rejects(() => store.acquireExtraction("fresh"), {
      code: "busy",
    });
    await assert.rejects(() => store.createCheck("fresh", randomUUID()), {
      code: "busy",
    });
    const duplicate = await store.createCheck("a", requestKey);
    assert.equal(duplicate.existing, true);
    assert.equal(duplicate.id, first.id);
    await store.finishCheck(first.id, "a", demoResult("deadline", "en"));
    await assert.rejects(() => store.getCheck(first.id, "a"), {
      code: "not_found",
    });
    await store.releaseWork(first.id, "wrong-owner");
    await assert.rejects(() => store.acquireExtraction("fresh"), {
      code: "busy",
    });
    await store.releaseWork(first.id, "a");
    const retry = await store.createCheck("a", requestKey);
    assert.equal(retry.existing, false);
    assert.notEqual(retry.id, first.id);
  });
}
test("network counter has bounded TTL and rejected admissions do not create leases", async () => {
  const ip = "test-network";
  const id = await store.acquireExtraction("a", ip);
  const keys = await client.keys(store.key("ip-work:*"));
  assert.equal(keys.length, 1);
  const ttl = await client.pttl(keys[0]);
  assert.ok(ttl > 0 && ttl <= 3600000);
  await store.releaseWork(id, "a");
  await client.set(keys[0], "39", "PX", ttl);
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, (_, i) =>
      store.acquireExtraction(`network-concurrent-${i}`, ip),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await client.get(keys[0]), "40");
  assert.equal(await client.zcard(store.key("active:v2")), 1);
});
