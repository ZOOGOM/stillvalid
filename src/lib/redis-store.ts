import { IP_WORK_LIMIT } from "./abuse";
import {
  SESSION_CHECKS_PER_HOUR,
  SESSION_EXTRACTIONS_PER_HOUR,
  dailyModelCallLimit,
} from "./limits";
import { randomUUID } from "node:crypto";
import { EnvHttpProxyAgent } from "undici";
import { AppError, type Result } from "./schema";
import { redisConfig } from "./redis-config";

export type RedisCommand = (...args: (string | number)[]) => Promise<unknown>;
const proxy =
  process.env.HTTP_PROXY || process.env.HTTPS_PROXY
    ? new EnvHttpProxyAgent()
    : undefined;
export async function restCommand(
  ...args: (string | number)[]
): Promise<unknown> {
  const config = redisConfig();
  if (!config) throw new AppError("storage", 503);
  try {
    const url = new URL(config.endpoint);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      ...(proxy ? { dispatcher: proxy } : {}),
    } as RequestInit);
    if (!response.ok) throw new Error();
    const data = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (data.error) throw new Error();
    return data.result;
  } catch {
    throw new AppError("storage", 503);
  }
}

export class RedisStore {
  constructor(
    private command: RedisCommand = restCommand,
    private prefix = "sv:{stillvalid}:",
  ) {}
  key(value: string) {
    return this.prefix + value;
  }
  async cleanup() {
    await this.command("PING");
  }
  async reserve(key: string, maximum: number, windowMs: number) {
    const now = Date.now(),
      slot = Math.floor(now / windowMs);
    const result = await this.command(
      "EVAL",
      `local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>=tonumber(ARGV[1]) then return 0 end; redis.call('INCR',KEYS[1]); redis.call('PEXPIREAT',KEYS[1],ARGV[2]); return 1`,
      1,
      this.key("limit:" + key + ":" + slot),
      maximum,
      (slot + 1) * windowMs,
    );
    if (Number(result) !== 1) throw new AppError("rate_limit", 429);
  }
  async reserveModelCall() {
    await this.reserve("model:global", dailyModelCallLimit(), 86400000);
  }
  // Admissions share a rolling 60-second window and three execution leases
  // across both paid routes. 210 seconds exceeds their 180s/90s hard deadlines.
  // Versioned execution metadata is isolated from legacy result-deletion Lua.
  async createCheck(
    actor: string,
    requestKey: string,
    abuse?: string,
  ): Promise<{ id: string; existing: boolean }> {
    const now = Date.now(),
      slot = Math.floor(now / 3600000),
      id = randomUUID();
    const row = (await this.command(
      "EVAL",
      `
      local running=redis.call('GET',KEYS[8]);
      if running and tonumber(redis.call('ZSCORE',KEYS[2],running) or '0')>tonumber(ARGV[1]) then return {running,'1'} end;
      local existing=redis.call('GET',KEYS[1]);
      if existing then
        if redis.call('HGET',ARGV[6]..existing,'owner')==ARGV[3] or tonumber(redis.call('ZSCORE',KEYS[2],existing) or '0')>tonumber(ARGV[1]) then return {existing,'1'} end;
        redis.call('DEL',KEYS[1]);
      end;
      redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[1]);
      if redis.call('ZCARD',KEYS[2])>=3 then return {'busy','error'} end;
      local count=tonumber(redis.call('GET',KEYS[3]) or '0'); if count>=${SESSION_CHECKS_PER_HOUR} then return {'rate_limit','error'} end;
      redis.call('ZREMRANGEBYSCORE',KEYS[6],'-inf',tonumber(ARGV[1])-60000);
      if redis.call('ZCARD',KEYS[6])>=10 then return {'rate_limit','error'} end;
      if ARGV[8]=='1' and tonumber(redis.call('GET',KEYS[10]) or '0')>=tonumber(ARGV[9]) then return {'rate_limit','error'} end;
      if ARGV[8]=='1' then redis.call('INCR',KEYS[10]);redis.call('PEXPIREAT',KEYS[10],ARGV[5]) end;
      redis.call('ZADD',KEYS[6],ARGV[1],ARGV[2]);redis.call('PEXPIRE',KEYS[6],60000);
      redis.call('SET',KEYS[7],ARGV[3],'PX',210000);
      redis.call('SET',KEYS[8],ARGV[2],'PX',210000);
      redis.call('SET',KEYS[9],KEYS[8],'PX',210000);
      redis.call('INCR',KEYS[3]); redis.call('PEXPIREAT',KEYS[3],ARGV[5]);
      redis.call('SET',KEYS[1],ARGV[2],'EX',86400);
      redis.call('HSET',KEYS[4],'owner',ARGV[3],'state','processing','result','','created',ARGV[1],'expires',ARGV[4],'request_key',ARGV[7]);redis.call('EXPIRE',KEYS[4],86400);
      redis.call('ZADD',KEYS[2],tonumber(ARGV[1])+210000,ARGV[2]); redis.call('EXPIRE',KEYS[2],86400);
      redis.call('SADD',KEYS[5],ARGV[2]);redis.call('EXPIRE',KEYS[5],86400);
      return {ARGV[2],'0'};
    `,
      10,
      this.key("idem:" + actor + ":" + requestKey),
      this.key("active:v2"),
      this.key("check-limit:" + actor + ":" + slot),
      this.key("check:" + id),
      this.key("owner:" + actor),
      this.key("admissions"),
      this.key("lease-owner:v2:" + id),
      this.key("inflight:v2:" + actor + ":" + requestKey),
      this.key("lease-request:v2:" + id),
      this.key("ip-work:" + (abuse || "disabled") + ":" + slot),
      now,
      id,
      actor,
      now + 86400000,
      (slot + 1) * 3600000,
      this.key("check:"),
      requestKey,
      abuse ? "1" : "0",
      IP_WORK_LIMIT,
    )) as string[];
    if (row[1] === "error") throw new AppError(row[0], 429);
    return { id: row[0], existing: row[1] === "1" };
  }
  // State changes and deletion never release execution leases. The runner
  // releases only after awaited work settles; crashes recover through expiry.
  async transition(
    id: string,
    actor: string,
    state: string,
    result: Result | null,
  ) {
    await this.command(
      "EVAL",
      `
      if redis.call('HGET',KEYS[1],'owner')~=ARGV[1] or redis.call('HGET',KEYS[1],'state')~='processing' then return 0 end;
      redis.call('HSET',KEYS[1],'state',ARGV[2],'result',ARGV[3]);return 1;
    `,
      2,
      this.key("check:" + id),
      this.key("active:v2"),
      actor,
      state,
      JSON.stringify(result),
      id,
    );
  }
  async finishCheck(id: string, actor: string, result: Result) {
    await this.transition(id, actor, "complete", result);
  }
  async failCheck(id: string, actor: string) {
    await this.transition(id, actor, "interrupted", null);
  }
  async getCheck(
    id: string,
    actor: string,
  ): Promise<{ state: string; result: Result | null }> {
    const raw = (await this.command(
      "HMGET",
      this.key("check:" + id),
      "owner",
      "state",
      "result",
      "created",
      "expires",
    )) as (string | null)[];
    if (!raw[0]) throw new AppError("not_found", 404);
    const row = {
      owner: raw[0],
      state: raw[1] || "interrupted",
      result: raw[2] ? (JSON.parse(raw[2]) as Result | null) : null,
      created: Number(raw[3]),
      expires: Number(raw[4]),
    };
    if (row.owner !== actor || row.expires < Date.now())
      throw new AppError("not_found", 404);
    if (row.state === "processing" && row.created < Date.now() - 210000) {
      await this.failCheck(id, actor);
      return { state: "interrupted", result: null };
    }
    return { state: row.state, result: row.result };
  }
  async deleteCheck(id: string, actor: string) {
    await this.command(
      "EVAL",
      `if redis.call('HGET',KEYS[1],'owner')~=ARGV[1] then return 0 end;local request=redis.call('HGET',KEYS[1],'request_key');if request then local idem=ARGV[3]..request;if redis.call('GET',idem)==ARGV[2] and not redis.call('ZSCORE',KEYS[2],ARGV[2]) then redis.call('DEL',idem) end;end;redis.call('DEL',KEYS[1]);redis.call('SREM',KEYS[3],ARGV[2]);return 1`,
      3,
      this.key("check:" + id),
      this.key("active:v2"),
      this.key("owner:" + actor),
      actor,
      id,
      this.key("idem:" + actor + ":"),
    );
  }
  async deleteAllChecks(actor: string) {
    await this.command(
      "EVAL",
      `local ids=redis.call('SMEMBERS',KEYS[1]);for _,id in ipairs(ids) do local key=ARGV[2]..id;if redis.call('HGET',key,'owner')==ARGV[1] then local request=redis.call('HGET',key,'request_key');if request then local idem=ARGV[3]..request;if redis.call('GET',idem)==id and not redis.call('ZSCORE',KEYS[2],id) then redis.call('DEL',idem) end;end;redis.call('DEL',key);end;end;redis.call('DEL',KEYS[1]);return 1`,
      2,
      this.key("owner:" + actor),
      this.key("active:v2"),
      actor,
      this.key("check:"),
      this.key("idem:" + actor + ":"),
    );
  }
  async acquireExtraction(actor: string, abuse?: string): Promise<string> {
    const now = Date.now(),
      id = randomUUID(),
      slot = Math.floor(now / 3600000);
    const outcome = await this.command(
      "EVAL",
      `
      redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]);
      if redis.call('ZCARD',KEYS[1])>=3 then return 'busy' end;
      redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',tonumber(ARGV[1])-60000);
      if redis.call('ZCARD',KEYS[2])>=10 then return 'rate_limit' end;
      if tonumber(redis.call('GET',KEYS[3]) or '0')>=${SESSION_EXTRACTIONS_PER_HOUR} then return 'rate_limit' end;
      if ARGV[6]=='1' and tonumber(redis.call('GET',KEYS[5]) or '0')>=tonumber(ARGV[7]) then return 'rate_limit' end;
      if ARGV[6]=='1' then redis.call('INCR',KEYS[5]);redis.call('PEXPIREAT',KEYS[5],ARGV[5]) end;
      redis.call('INCR',KEYS[3]);redis.call('PEXPIREAT',KEYS[3],ARGV[5]);
      redis.call('ZADD',KEYS[1],tonumber(ARGV[1])+210000,ARGV[2]);redis.call('EXPIRE',KEYS[1],86400);
      redis.call('ZADD',KEYS[2],ARGV[1],ARGV[2]);redis.call('PEXPIRE',KEYS[2],60000);
      redis.call('SET',KEYS[4],ARGV[3],'PX',210000);
      return 'ok';`,
      5,
      this.key("active:v2"),
      this.key("admissions"),
      this.key("limit:extract:" + actor + ":" + slot),
      this.key("lease-owner:v2:" + id),
      this.key("ip-work:" + (abuse || "disabled") + ":" + slot),
      now,
      id,
      actor,
      210000,
      (slot + 1) * 3600000,
      abuse ? "1" : "0",
      IP_WORK_LIMIT,
    );
    if (outcome !== "ok") throw new AppError(String(outcome), 429);
    return id;
  }
  async releaseWork(id: string, actor: string) {
    await this.command(
      "EVAL",
      `
      if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;
      local request=redis.call('GET',KEYS[3]);
      if request and redis.call('GET',request)==ARGV[2] then redis.call('DEL',request) end;
      redis.call('DEL',KEYS[1],KEYS[3]);redis.call('ZREM',KEYS[2],ARGV[2]);return 1;`,
      3,
      this.key("lease-owner:v2:" + id),
      this.key("active:v2"),
      this.key("lease-request:v2:" + id),
      actor,
      id,
    );
  }
}
