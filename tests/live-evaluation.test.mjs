import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  runEvaluation,
  validateCases,
  scoreResult,
} from "../scripts/evaluate-live.mjs";

const cases = [
  {
    id: "fixture-01",
    kind: "synthetic",
    lang: "ko",
    country: null,
    input: { text: "합성 공고" },
  },
];
async function fixture(mode, run) {
  let sessions = 0,
    owner,
    deleted = false,
    paid = 0;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (req.url === "/api/status") {
      res.setHeader(
        "Set-Cookie",
        `sv_session=${String(++sessions).repeat(64)}; HttpOnly; Path=/`,
      );
      return res.end(
        JSON.stringify({
          liveAvailable: true,
          deploymentSha: "a".repeat(40),
          model: "test-model",
        }),
      );
    }
    if (req.url === "/api/extract") {
      paid++;
      assert.equal(JSON.parse(body).text, "합성 공고");
      if (mode === "rate") {
        res.statusCode = 429;
        return res.end('{"error":"rate_limit"}');
      }
      owner = req.headers.cookie;
      return res.end('{"notice":{"title":"합성"}}');
    }
    const result = {
      id: "fixture-id",
      mode: "live",
      status: "review",
      comparisons: [],
      sources: [],
      warnings: [],
      expiresAt: "2030-01-01T00:00:00Z",
    };
    if (req.url === "/api/checks") {
      paid++;
      assert.equal(JSON.parse(body).sourceUrl, "");
      assert.match(JSON.parse(body).requestKey, /^[a-f0-9-]{36}$/);
      res.setHeader("Content-Type", "application/x-ndjson");
      const data = Buffer.from(
        JSON.stringify({ type: "created", data: { id: "fixture-id" } }) +
          "\n" +
          JSON.stringify(
            mode === "stream"
              ? { type: "error", data: { code: "PRIVATE PROVIDER BODY" } }
              : {
                  type: "result",
                  data: { ...result, title: "분할 UTF8 비공개" },
                },
          ),
      );
      // Split both JSON tokens and UTF-8 bytes, with no final newline.
      for (let i = 0; i < data.length; i += 5) {
        res.write(data.subarray(i, i + 5));
        await new Promise((r) => setImmediate(r));
      }
      return res.end();
    }
    if (req.url === "/api/checks/fixture-id") {
      if (deleted || (req.headers.cookie !== owner && mode !== "isolation")) {
        res.statusCode = 404;
        return res.end("{}");
      }
      if (req.method === "DELETE") {
        deleted = true;
        res.statusCode = 204;
        return res.end();
      }
      return res.end(JSON.stringify({ state: "complete", result }));
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, () => paid);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("dry run has no HTTP calls and empty template cannot execute", async () => {
  const r = await runEvaluation({ url: "https://example.invalid", cases });
  assert.equal(r.summary.networkRequests, 0);
  await assert.rejects(
    runEvaluation({ url: "https://example.invalid", cases: [], execute: true }),
    /real_cases_required/,
  );
  await assert.rejects(
    runEvaluation({ url: "https://example.invalid", cases, execute: true }),
    /real_cases_required/,
  );
});
test("chunked HTTP flow checks isolation/deletion and excludes synthetic accuracy", async () => {
  await fixture("ok", async (url, paid) => {
    const r = await runEvaluation({ url, cases, execute: true, fixture: true });
    assert.equal(r.summary.completed, 1);
    assert.equal(r.summary.scoredCases, 0);
    assert.equal(r.records[0].isolation, "passed");
    assert.equal(r.records[0].deletion, "passed");
    assert.equal(r.records[0].search, "requested_no_failure_warning");
    assert.equal(paid(), 2);
    assert.ok(!JSON.stringify(r).includes("비공개"));
    assert.ok(!JSON.stringify(r).includes("sv_session"));
  });
});
test("stream error is sanitized, cleans result and stops before next paid case", async () => {
  await fixture("stream", async (url, paid) => {
    const r = await runEvaluation({
      url,
      cases: [...cases, { ...cases[0], id: "fixture-02" }],
      execute: true,
      fixture: true,
    });
    assert.equal(r.records.length, 1);
    assert.equal(r.records[0].error, "stream_error");
    assert.equal(r.records[0].deletion, "passed");
    assert.equal(paid(), 2);
    assert.ok(!JSON.stringify(r).includes("PRIVATE"));
  });
});
test("429 is not retried and isolation breaches fail", async () => {
  await fixture("rate", async (url, paid) => {
    const r = await runEvaluation({ url, cases, execute: true, fixture: true });
    assert.equal(r.records[0].error, "rate_limit_stop");
    assert.equal(paid(), 1);
  });
  await fixture("isolation", async (url) => {
    const r = await runEvaluation({ url, cases, execute: true, fixture: true });
    assert.equal(r.records[0].error, "isolation_failed");
    assert.equal(r.summary.completed, 0);
  });
});
test("human reference supports new cancellation with null before, rejects invalid expectations", () => {
  const c = {
    ...cases[0],
    kind: "real",
    expectedStatus: "cancelled",
    humanReference: {
      url: "https://example.org/official",
      checkedAt: "2026-11-03T00:00:00Z",
      reviewed: true,
    },
    expectedFields: [
      {
        key: "status",
        before: null,
        after: "cancelled",
        beforeQuote: null,
        afterQuote: "Event cancelled",
      },
    ],
  };
  assert.equal(validateCases({ version: 1, cases: [c] }).length, 1);
  assert.throws(
    () =>
      validateCases({
        version: 1,
        cases: [{ ...c, expectedStatus: "invented" }],
      }),
    /invalid_expected_status/,
  );
});

test("human-reviewed nondefinitive outcomes can be scored without fabricated fields", () => {
  const base = {
    ...cases[0],
    kind: "real",
    humanReference: {
      url: "https://example.org/official",
      checkedAt: "2026-11-03T00:00:00Z",
      reviewed: true,
    },
  };
  for (const expectedStatus of ["review", "unavailable"]) {
    for (const expectedFields of [undefined, []]) {
      const c = { ...base, expectedStatus, expectedFields };
      const result = { status: expectedStatus, comparisons: [], sources: [] };
      assert.equal(scoreResult(c, result).verdict, "pass");
      assert.equal(scoreResult(c, result).scoreScope, "status_only");
      assert.equal(
        scoreResult(c, { ...result, status: "matched" }).verdict,
        "fail",
      );
      assert.equal(
        scoreResult(c, result, { fixture: true }).verdict,
        "not_scored",
      );
      assert.equal(
        scoreResult({ ...c, kind: "synthetic" }, result).verdict,
        "not_scored",
      );
      assert.equal(
        scoreResult({ ...c, humanReference: undefined }, result).verdict,
        "not_scored",
      );
      assert.throws(
        () =>
          scoreResult(
            { ...c, humanReference: { ...c.humanReference, reviewed: false } },
            result,
          ),
        /invalid_human_reference/,
      );
    }
  }
  for (const expectedStatus of ["changed", "matched", "cancelled", "expired"]) {
    const c = { ...base, expectedStatus };
    assert.equal(
      scoreResult(c, { status: expectedStatus }).verdict,
      "not_scored",
    );
    assert.throws(
      () =>
        validateCases({ version: 1, cases: [{ ...c, expectedFields: [] }] }),
      /invalid_expected_fields/,
    );
  }
});

test("explicit unverified fields require value, verification and nullable quote agreement", () => {
  const field = {
    key: "date",
    before: "next Friday",
    after: null,
    beforeQuote: "next Friday",
    afterQuote: null,
    verified: false,
  };
  const c = {
    ...cases[0],
    kind: "real",
    expectedStatus: "review",
    humanReference: {
      url: "https://example.org/official",
      checkedAt: "2026-11-03T00:00:00Z",
      reviewed: true,
    },
    expectedFields: [field],
  };
  const result = {
    status: "review",
    comparisons: [{ ...field, sourceId: "none" }],
    sources: [],
  };
  assert.equal(scoreResult(c, result).verdict, "pass");
  assert.equal(scoreResult(c, result).scoreScope, "status_and_expected_fields");
  for (const difference of [
    { verified: true },
    { after: "2030-01-01" },
    { afterQuote: "invented" },
  ]) {
    assert.equal(
      scoreResult(c, {
        ...result,
        comparisons: [{ ...result.comparisons[0], ...difference }],
      }).verdict,
      "fail",
    );
  }
  assert.throws(
    () =>
      validateCases({
        version: 1,
        cases: [{ ...c, expectedStatus: "matched" }],
      }),
    /invalid_expected_field/,
  );
  const definitive = {
    ...c,
    expectedStatus: "changed",
    expectedFields: [
      {
        ...field,
        verified: true,
        after: "2030-01-01",
        afterQuote: "New date: 2030-01-01",
      },
    ],
  };
  const definitiveResult = {
    status: "changed",
    comparisons: [{ ...definitive.expectedFields[0], sourceId: "official" }],
    sources: [{ id: "official", url: c.humanReference.url }],
  };
  assert.equal(scoreResult(definitive, definitiveResult).verdict, "pass");
  assert.equal(
    scoreResult(definitive, { ...definitiveResult, sources: [] }).verdict,
    "fail",
  );
});
