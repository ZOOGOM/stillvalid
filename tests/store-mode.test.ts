import test from "node:test";
import assert from "node:assert/strict";
import { cleanup } from "../src/lib/store";
test("serverless deployment without shared storage fails closed", async () => {
  const previous = {
    vercel: process.env.VERCEL,
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  process.env.VERCEL = "1";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await assert.rejects(() => cleanup(), { code: "storage", status: 503 });
  } finally {
    for (const [key, value] of [
      ["VERCEL", previous.vercel],
      ["UPSTASH_REDIS_REST_URL", previous.url],
      ["UPSTASH_REDIS_REST_TOKEN", previous.token],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
test("a partial storage configuration does not fall back to a local file", async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://test-only.upstash.io";
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await assert.rejects(() => cleanup(), { code: "storage", status: 503 });
  } finally {
    if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = url;
    if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = token;
  }
});
