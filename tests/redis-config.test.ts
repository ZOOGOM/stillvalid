import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { redisConfig } from "../src/lib/redis-config";
import { cleanup } from "../src/lib/store";
import { db } from "../src/lib/sqlite-store";

const keys = [
  "VERCEL",
  "DATABASE_PATH",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "KV_REST_API_READ_ONLY_TOKEN",
  "KV_URL",
  "REDIS_URL",
] as const;

async function withEnvironment(
  values: Partial<Record<(typeof keys)[number], string>>,
  run: () => Promise<void>,
) {
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Marketplace REST settings select Redis and send the write token", async () => {
  await withEnvironment(
    {
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_TOKEN: "marketplace-write-token",
      KV_REST_API_READ_ONLY_TOKEN: "read-only-token",
    },
    async () => {
      const originalFetch = globalThis.fetch;
      let called = false;
      globalThis.fetch = async (input, init) => {
        called = true;
        assert.equal(String(input), "https://marketplace.example.test/");
        assert.equal(
          new Headers(init?.headers).get("authorization"),
          "Bearer marketplace-write-token",
        );
        assert.deepEqual(JSON.parse(String(init?.body)), ["PING"]);
        return Response.json({ result: "PONG" });
      };
      try {
        await cleanup();
        assert.equal(called, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("complete canonical credentials take precedence over Marketplace values", async () => {
  await withEnvironment(
    {
      UPSTASH_REDIS_REST_URL: "https://canonical.example.test",
      UPSTASH_REDIS_REST_TOKEN: "canonical-token",
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_TOKEN: "marketplace-token",
    },
    async () => {
      const originalFetch = globalThis.fetch;
      let called = false;
      globalThis.fetch = async (input, init) => {
        called = true;
        assert.equal(String(input), "https://canonical.example.test/");
        assert.equal(
          new Headers(init?.headers).get("authorization"),
          "Bearer canonical-token",
        );
        return Response.json({ result: "PONG" });
      };
      try {
        await cleanup();
        assert.equal(called, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("partial REST settings fail closed without mixing credential pairs", async () => {
  for (const values of [
    {
      UPSTASH_REDIS_REST_URL: "https://canonical.example.test",
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_TOKEN: "token",
    },
    {
      UPSTASH_REDIS_REST_TOKEN: "token",
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_TOKEN: "token",
    },
    {
      UPSTASH_REDIS_REST_URL: "https://canonical.example.test",
      UPSTASH_REDIS_REST_TOKEN: "",
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_TOKEN: "token",
    },
    {
      KV_REST_API_URL: "https://marketplace.example.test",
      KV_REST_API_READ_ONLY_TOKEN: "read-only-token",
    },
    { KV_REST_API_TOKEN: "token" },
  ]) {
    await withEnvironment(values, async () => {
      await assert.rejects(() => cleanup(), { code: "storage", status: 503 });
    });
  }
});

test("blank REST variables allow local SQLite", async () => {
  const directory = mkdtempSync(join(tmpdir(), "stillvalid-redis-config-"));
  const path = join(directory, "test.sqlite");
  try {
    await withEnvironment(
      {
        DATABASE_PATH: path,
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "",
      },
      async () => {
        assert.equal(redisConfig(), null);
        await cleanup();
        assert.equal(existsSync(path), true);
        db().close();
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("raw Redis URLs and read-only token cannot configure REST storage", async () => {
  await withEnvironment(
    {
      KV_URL: "redis://example.test",
      REDIS_URL: "redis://example.test",
      KV_REST_API_READ_ONLY_TOKEN: "read-only-token",
    },
    async () => {
      assert.equal(redisConfig(), null);
      process.env.VERCEL = "1";
      await assert.rejects(() => cleanup(), { code: "storage", status: 503 });
    },
  );
});
