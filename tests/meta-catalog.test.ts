import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function runCatalog(
  script: string,
  extra: Record<string, string> = {},
  blocked = false,
) {
  const fixture = `globalThis.fetch = async (url, options) => {
    if (String(url) !== 'https://api.meta.ai/v1/models' || (options?.method && options.method !== 'GET')) throw Error('unexpected request');
    console.log('CATALOG_GET');
    return ${blocked ? "new Response('must-not-print-provider-body', {status:403})" : "Response.json({data: [{id:'muse-spark-1.3-contributor'},{id:'muse-spark-1.3'},{id:'muse-spark-1.1'}]})"};
  };`;
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "data:text/javascript," + encodeURIComponent(fixture),
      script,
    ],
    {
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        META_API_KEY: "mock-catalog-credential",
        MODEL_API_KEY: "",
        META_MODEL: "muse-spark-1.3-contributor",
        META_EXTRACTION_MODEL: "",
        META_SEARCH_MODEL: "",
        META_COMPARISON_MODEL: "",
        STILLVALID_VERIFY_DEPLOYMENT: "0",
        ...extra,
      },
    },
  );
}

test("catalog verification checks effective step models without inference", () => {
  const result = runCatalog("scripts/check-meta.mjs", {
    META_MODEL: "muse-spark-1.3",
    META_EXTRACTION_MODEL: "muse-spark-1.1",
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(
    result.stdout.split("\n").find((line) => line.startsWith("{"))!,
  );
  assert.deepEqual(report.selectedModels, {
    extraction: "muse-spark-1.1",
    search: "muse-spark-1.3",
    comparison: "muse-spark-1.3",
  });
  assert.equal(report.selectedModelEnabled, true);
  assert.equal(report.inferenceTested, false);
  assert.equal(result.stdout.includes("mock-catalog-credential"), false);
});

test("production catalog guard runs before the optional inference probe and fails only for a missing selected model", () => {
  const ok = runCatalog("scripts/check-hosted.mjs", {
    VERCEL_ENV: "production",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.match(/CATALOG_GET/g)?.length, 1);
  assert.match(ok.stdout, /"hostedVerification":"skipped"/);
  const missing = runCatalog("scripts/check-hosted.mjs", {
    VERCEL_ENV: "production",
    META_SEARCH_MODEL: "not-available",
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /"phase":"model-catalog"/);
  const blocked = runCatalog(
    "scripts/check-hosted.mjs",
    { VERCEL_ENV: "production" },
    true,
  );
  // An unreadable catalog (HTTP error or network failure) is a warning, not a
  // failed build: only a catalog that lacks a selected model fails closed.
  assert.equal(blocked.status, 0, blocked.stderr);
  assert.match(blocked.stderr, /model check was skipped/);
  assert.match(blocked.stdout, /"catalogChecked":false/);
  assert.equal(
    (blocked.stdout + blocked.stderr).includes("must-not-print-provider-body"),
    false,
  );
});

test("preview builds do not request production catalog access", () => {
  const result = runCatalog("scripts/check-hosted.mjs", {
    VERCEL_ENV: "preview",
    META_API_KEY: "",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("CATALOG_GET"), false);
});
