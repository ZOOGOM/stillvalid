import * as local from "./sqlite-store";
import { RedisStore } from "./redis-store";
import { redisConfig } from "./redis-config";
import { AppError, type Result } from "./schema";
export { hash, newSession, owner, sameOrigin } from "./sqlite-store";
const redis = new RedisStore();
function backend() {
  if (redisConfig()) return redis;
  if (process.env.VERCEL) throw new AppError("storage", 503);
  return local;
}
export async function cleanup() {
  await backend().cleanup();
}
export async function reserve(key: string, maximum: number, windowMs: number) {
  await backend().reserve(key, maximum, windowMs);
}
export async function reserveModelCall() {
  await backend().reserveModelCall();
}
export async function createCheck(actor: string, key: string) {
  return await backend().createCheck(actor, key);
}
export async function finishCheck(id: string, actor: string, result: Result) {
  await backend().finishCheck(id, actor, result);
}
export async function failCheck(id: string, actor: string) {
  await backend().failCheck(id, actor);
}
export async function getCheck(id: string, actor: string) {
  return await backend().getCheck(id, actor);
}
export async function deleteCheck(id: string, actor: string) {
  await backend().deleteCheck(id, actor);
}
export async function deleteAllChecks(actor: string) {
  await backend().deleteAllChecks(actor);
}
