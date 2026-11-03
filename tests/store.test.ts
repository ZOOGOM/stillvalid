import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import * as store from "../src/lib/sqlite-store";
const directory = mkdtempSync(join(tmpdir(), "stillvalid-store-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
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
