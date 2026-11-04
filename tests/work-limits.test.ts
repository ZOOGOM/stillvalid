import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import Redis from "ioredis-mock";
import * as sqlite from "../src/lib/sqlite-store";
import { RedisStore } from "../src/lib/redis-store";
import { demoResult } from "../src/lib/demo";
const directory = mkdtempSync(join(tmpdir(), "stillvalid-admission-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
const client = new Redis();
const redis = new RedisStore(async (...args) => {
  const methods = client as unknown as Record<
    string,
    (...values: (string | number)[]) => Promise<unknown>
  >;
  return methods[String(args[0]).toLowerCase()].apply(client, args.slice(1));
});
test.afterEach(async () => {
  sqlite
    .db()
    .exec(
      "DELETE FROM checks; DELETE FROM limits; DELETE FROM work_leases; DELETE FROM work_admissions",
    );
  await client.flushall();
});
test.after(() => {
  sqlite.db().close();
  rmSync(directory, { recursive: true, force: true });
  client.disconnect();
});
for (const [name, store] of [
  ["SQLite", sqlite],
  ["Redis Lua emulator", redis],
] as const) {
  test(`${name}: network quota survives cookie rotation and deletion, without charging duplicates`, async (t) => {
    let now = Math.floor(Date.now() / 3600000) * 3600000 + 1000;
    t.mock.method(Date, "now", () => now);
    for (let i = 0; i < 40; i++) {
      const actor = `ip-actor-${i}`;
      if (i % 2) {
        const requestKey = randomUUID();
        const job = await store.createCheck(actor, requestKey, "network-a");
        assert.equal(
          (await store.createCheck(actor, requestKey, "network-a")).existing,
          true,
        );
        await store.deleteAllChecks(actor);
        await store.releaseWork(job.id, actor);
      } else {
        const id = await store.acquireExtraction(actor, "network-a");
        await store.releaseWork(id, actor);
      }
      now += 61000;
    }
    await assert.rejects(
      async () => store.acquireExtraction("fresh", "network-a"),
      { code: "rate_limit" },
    );
    await assert.rejects(
      async () => store.createCheck("fresh", randomUUID(), "network-a"),
      { code: "rate_limit" },
    );
    const independent = await store.acquireExtraction(
      "independent",
      "network-b",
    );
    await store.releaseWork(independent, "independent");
    now = Math.ceil(now / 3600000) * 3600000 + 1000;
    await store.acquireExtraction("new-window", "network-a");
  });
  test(`${name}: denied global admission does not consume network allowance`, async () => {
    await store.acquireExtraction("a");
    await store.acquireExtraction("b");
    await store.acquireExtraction("c");
    await assert.rejects(
      async () => store.acquireExtraction("d", "network-denied"),
      { code: "busy" },
    );
    if (name === "SQLite") {
      const rows = sqlite
        .db()
        .prepare("SELECT count(*) AS n FROM limits WHERE key LIKE 'ip-work:%'")
        .get() as { n: number };
      assert.equal(rows.n, 0);
    } else {
      assert.deepEqual(await client.keys(redis.key("ip-work:*")), []);
    }
  });
  for (const all of [false, true]) {
    test(`${name}: ${all ? "session" : "single"} deletion retains all running slots and prevents late resurrection`, async () => {
      const jobs: { id: string; existing: boolean }[] = [];
      for (let i = 0; i < 3; i++)
        jobs.push(await store.createCheck("a", randomUUID()));
      if (all) await store.deleteAllChecks("a");
      else await store.deleteCheck(jobs[0].id, "a");
      await assert.rejects(async () => store.createCheck("b", randomUUID()), {
        code: "busy",
      });
      await assert.rejects(
        async () => store.acquireExtraction("fresh-cookie"),
        { code: "busy" },
      );
      await store.finishCheck(jobs[0].id, "a", demoResult("deadline", "en"));
      await assert.rejects(async () => store.getCheck(jobs[0].id, "a"), {
        code: "not_found",
      });
      await store.releaseWork(jobs[0].id, "other-actor");
      await assert.rejects(async () => store.acquireExtraction("b"), {
        code: "busy",
      });
      await store.releaseWork(jobs[0].id, "a");
      await store.acquireExtraction("b");
    });
  }
  test(`${name}: extraction and checks share three execution slots`, async () => {
    const extraction = await store.acquireExtraction("a");
    await store.createCheck("b", randomUUID());
    await store.acquireExtraction("c");
    await assert.rejects(async () => store.createCheck("d", randomUUID()), {
      code: "busy",
    });
    await store.releaseWork(extraction, "a");
    await store.createCheck("d", randomUUID());
  });
  test(`${name}: changing anonymous actors cannot evade the shared rolling burst budget`, async () => {
    for (let i = 0; i < 10; i++) {
      const actor = `new-cookie-${i}`;
      if (i % 2) {
        const job = await store.createCheck(actor, randomUUID());
        await store.failCheck(job.id, actor);
        await store.releaseWork(job.id, actor);
      } else {
        const id = await store.acquireExtraction(actor);
        await store.releaseWork(id, actor);
      }
    }
    await assert.rejects(
      async () => store.acquireExtraction("eleventh-cookie"),
      { code: "rate_limit" },
    );
    await assert.rejects(
      async () => store.createCheck("twelfth-cookie", randomUUID()),
      { code: "rate_limit" },
    );
  });
  test(`${name}: a deleted running request key cannot create a second paid job`, async () => {
    const key = randomUUID(),
      first = await store.createCheck("a", key);
    await store.deleteCheck(first.id, "a");
    const duplicate = await store.createCheck("a", key);
    assert.equal(duplicate.id, first.id);
    assert.equal(duplicate.existing, true);
    await store.releaseWork(first.id, "a");
    const retry = await store.createCheck("a", key);
    assert.equal(retry.existing, false);
    assert.notEqual(retry.id, first.id);
  });
  test(`${name}: cancelled state retains its slot until execution actually ends`, async () => {
    const first = await store.createCheck("a", randomUUID());
    await store.acquireExtraction("b");
    await store.acquireExtraction("c");
    await store.failCheck(first.id, "a");
    await assert.rejects(async () => store.acquireExtraction("d"), {
      code: "busy",
    });
    await store.releaseWork(first.id, "a");
    await store.acquireExtraction("d");
  });
  test(`${name}: rolling admission window does not reset at a wall-clock minute boundary`, async (t) => {
    let now = Math.ceil(Date.now() / 60000) * 60000 - 1000;
    t.mock.method(Date, "now", () => now);
    for (let i = 0; i < 10; i++) {
      const actor = `boundary-${i}`;
      const id = await store.acquireExtraction(actor);
      await store.releaseWork(id, actor);
    }
    now += 2000;
    await assert.rejects(
      async () => store.acquireExtraction("after-boundary"),
      { code: "rate_limit" },
    );
    now += 58000;
    await store.acquireExtraction("after-full-window");
  });
  test(`${name}: concurrent mixed admissions cannot exceed three slots`, async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 9 }, async (_, i) =>
        i % 2
          ? store.createCheck(`parallel-${i}`, randomUUID())
          : store.acquireExtraction(`parallel-${i}`),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
    assert.equal(
      results.filter((r) => r.status === "rejected" && r.reason.code === "busy")
        .length,
      6,
    );
  });
  test(`${name}: crashed leases survive the route deadline and recover after 210 seconds`, async (t) => {
    let now = Date.now();
    t.mock.method(Date, "now", () => now);
    const job = await store.createCheck("a", randomUUID());
    await store.acquireExtraction("b");
    await store.acquireExtraction("c");
    now += 181000;
    assert.equal((await store.getCheck(job.id, "a")).state, "processing");
    await assert.rejects(async () => store.acquireExtraction("d"), {
      code: "busy",
    });
    now += 30000;
    assert.equal((await store.getCheck(job.id, "a")).state, "interrupted");
    await store.acquireExtraction("d");
  });
  test(`${name}: daily model allowance remains atomic across actors`, async () => {
    const outcomes = await Promise.allSettled(
      Array.from({ length: 105 }, async () => store.reserveModelCall()),
    );
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 100);
    assert.equal(
      outcomes.filter(
        (r) => r.status === "rejected" && r.reason.code === "rate_limit",
      ).length,
      5,
    );
  });
}
