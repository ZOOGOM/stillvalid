import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { AppError, type Result } from "./schema";

let database: DatabaseSync | undefined;
export function db(): DatabaseSync {
  if (database) return database;
  const path =
    process.env.DATABASE_PATH ||
    resolve(process.cwd(), ".data/stillvalid.sqlite");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS checks (id TEXT PRIMARY KEY, owner TEXT NOT NULL, state TEXT NOT NULL, result TEXT, created INTEGER NOT NULL, expires INTEGER NOT NULL, request_key TEXT, UNIQUE(owner, request_key));
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  const timer = setInterval(() => {
    try {
      cleanup();
    } catch {
      /* retried on the next interval/request */
    }
  }, 60000);
  timer.unref();
  return database;
}
export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
export function newSession(): string {
  return randomBytes(32).toString("hex");
}
export function owner(request: NextRequest): string {
  const token = request.cookies.get("sv_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError("session", 401);
  return hash(token);
}
export function sameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (origin !== expected) throw new AppError("origin", 403);
}
export function cleanup(): void {
  const now = Date.now();
  db().prepare("DELETE FROM checks WHERE expires < ?").run(now);
  db().prepare("DELETE FROM limits WHERE expires < ?").run(now);
  db()
    .prepare(
      "UPDATE checks SET state = 'interrupted' WHERE state = 'processing' AND created < ?",
    )
    .run(now - 180000);
}
export function reserve(key: string, maximum: number, windowMs: number): void {
  const now = Date.now(),
    slot = Math.floor(now / windowMs);
  const statement = db().prepare(
    "INSERT INTO limits(key, count, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count",
  );
  const row = statement.get(key + ":" + slot, (slot + 1) * windowMs, maximum);
  if (!row) throw new AppError("rate_limit", 429);
}
export function reserveModelCall(): void {
  const raw = Number(process.env.DAILY_MODEL_CALL_LIMIT || 100);
  const maximum = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
  reserve("model:global", maximum, 86400000);
}
export function createCheck(
  actor: string,
  key: string,
): { id: string; existing: boolean } {
  cleanup();
  const existing = db()
    .prepare("SELECT id FROM checks WHERE owner = ? AND request_key = ?")
    .get(actor, key) as { id: string } | undefined;
  if (existing) return { id: existing.id, existing: true };
  const processing = db()
    .prepare("SELECT count(*) AS count FROM checks WHERE state = 'processing'")
    .get() as { count: number };
  if (processing.count >= 3) throw new AppError("busy", 429);
  reserve("check:" + actor, 12, 3600000);
  const id = randomUUID(),
    now = Date.now();
  db()
    .prepare(
      "INSERT INTO checks (id, owner, state, created, expires, request_key) VALUES (?, ?, 'processing', ?, ?, ?)",
    )
    .run(id, actor, now, now + 86400000, key);
  return { id, existing: false };
}
export function finishCheck(id: string, actor: string, result: Result): void {
  db()
    .prepare(
      "UPDATE checks SET state = 'complete', result = ? WHERE id = ? AND owner = ? AND state = 'processing'",
    )
    .run(JSON.stringify(result), id, actor);
}
export function failCheck(id: string, actor: string): void {
  db()
    .prepare(
      "UPDATE checks SET state = 'interrupted' WHERE id = ? AND owner = ? AND state = 'processing'",
    )
    .run(id, actor);
}
export function getCheck(
  id: string,
  actor: string,
): { state: string; result: Result | null } {
  cleanup();
  const row = db()
    .prepare("SELECT state, result FROM checks WHERE id = ? AND owner = ?")
    .get(id, actor) as { state: string; result: string | null } | undefined;
  if (!row) throw new AppError("not_found", 404);
  return {
    state: row.state,
    result: row.result ? (JSON.parse(row.result) as Result) : null,
  };
}
export function deleteCheck(id: string, actor: string): void {
  db().prepare("DELETE FROM checks WHERE id = ? AND owner = ?").run(id, actor);
}
export function deleteAllChecks(actor: string): void {
  db().prepare("DELETE FROM checks WHERE owner = ?").run(actor);
}
