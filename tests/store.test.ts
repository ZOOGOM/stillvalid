import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import * as store from "../src/lib/sqlite-store";
const directory = mkdtempSync(join(tmpdir(), "stillvalid-store-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
test.afterEach(() => {
  store
    .db()
    .exec(
      "DELETE FROM checks; DELETE FROM limits; DELETE FROM work_leases; DELETE FROM work_admissions",
    );
});
test.after(() => {
  store.db().close();
  rmSync(directory, { recursive: true, force: true });
});
test("idempotency returns the same check instead of creating a second paid job", () => {
  const key = randomUUID();
  const a = store.createCheck("owner-a", key),
    b = store.createCheck("owner-a", key);
  assert.equal(b.id, a.id);
  assert.equal(b.existing, true);
  store.failCheck(a.id, "owner-a");
});
test("another session cannot read or delete a user's result", () => {
  const job = store.createCheck("owner-a", randomUUID());
  assert.throws(() => store.getCheck(job.id, "owner-b"), { code: "not_found" });
  store.deleteCheck(job.id, "owner-b");
  assert.equal(store.getCheck(job.id, "owner-a").state, "processing");
  store.failCheck(job.id, "owner-a");
});
test("deletion is final and a late completion cannot resurrect a check", () => {
  const job = store.createCheck("owner-a", randomUUID());
  store.deleteCheck(job.id, "owner-a");
  assert.throws(() => store.getCheck(job.id, "owner-a"), { code: "not_found" });
});
test("expired checks are inaccessible and removed", () => {
  const job = store.createCheck("owner-a", randomUUID());
  store
    .db()
    .prepare("UPDATE checks SET expires = ? WHERE id = ?")
    .run(Date.now() - 1, job.id);
  assert.throws(() => store.getCheck(job.id, "owner-a"), { code: "not_found" });
});
test("session-wide deletion leaves other sessions intact", () => {
  const a = store.createCheck("owner-a", randomUUID()),
    b = store.createCheck("owner-b", randomUUID());
  store.deleteAllChecks("owner-a");
  assert.throws(() => store.getCheck(a.id, "owner-a"));
  assert.equal(store.getCheck(b.id, "owner-b").state, "processing");
  store.failCheck(b.id, "owner-b");
});
test("request limits reject calls beyond the reserved allowance", () => {
  const key = randomUUID();
  store.reserve(key, 2, 3600000);
  store.reserve(key, 2, 3600000);
  assert.throws(() => store.reserve(key, 2, 3600000), { code: "rate_limit" });
});
test("simultaneous SQLite processes share idempotency and the concurrency limit", async () => {
  store.db().exec("DELETE FROM checks; DELETE FROM limits");
  const run = async (keys: string[]) => {
    const children = keys.map((key, index) => {
      const child = fork(
        "-e",
        [
          `const store = require('./src/lib/sqlite-store.ts');
         store.db();
         process.send('ready');
         process.on('message', () => {
           try { process.send({job: store.createCheck('parallel', process.argv[1])}); }
           catch (error) { process.send({error: error.code || 'unexpected'}); }
           process.disconnect();
         });`,
          key,
        ],
        { execArgv: ["--import", "tsx"], silent: true },
      );
      return { child, index };
    });
    return await new Promise<
      Array<{ job?: { id: string; existing: boolean }; error?: string }>
    >((resolve, reject) => {
      const results: Array<{
        job?: { id: string; existing: boolean };
        error?: string;
      }> = [];
      let ready = 0,
        done = 0;
      for (const { child, index } of children) {
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code !== 0)
            reject(new Error(`SQLite worker exited with ${code}`));
        });
        child.on("message", (message) => {
          if (message === "ready") {
            if (++ready === children.length)
              for (const entry of children) entry.child.send("start");
          } else {
            results[index] = message as (typeof results)[number];
            if (++done === children.length) resolve(results);
          }
        });
      }
    });
  };
  const key = randomUUID();
  const duplicates = await run(Array(6).fill(key));
  assert.equal(
    duplicates.filter((entry) => entry.job && !entry.job.existing).length,
    1,
  );
  assert.equal(new Set(duplicates.map((entry) => entry.job?.id)).size, 1);
  store.failCheck(duplicates[0].job!.id, "parallel");
  store.releaseWork(duplicates[0].job!.id, "parallel");
  const attempts = await run(Array.from({ length: 6 }, () => randomUUID()));
  assert.equal(attempts.filter((entry) => entry.job).length, 3);
  assert.equal(attempts.filter((entry) => entry.error === "busy").length, 3);
});
