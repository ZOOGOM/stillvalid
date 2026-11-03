#!/usr/bin/env node
// Never accepts provider credentials. Input and cookies stay in memory.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const statuses = [
  "changed",
  "matched",
  "cancelled",
  "expired",
  "review",
  "unavailable",
];
const keys = ["deadline", "date", "location", "status", "cost", "eligibility"];
const languages = ["ko", "en", "ja", "zh", "es", "fr", "de", "pt", "ar", "ru"];
class Failure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const requireThat = (condition, code) => {
  if (!condition) throw new Failure(code);
};
const textOrNull = (v) => v === null || (typeof v === "string" && v.length > 0);
function publicReference(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function validateCases(input) {
  requireThat(
    input?.version === 1 &&
      Array.isArray(input.cases) &&
      input.cases.length <= 10,
    "invalid_cases",
  );
  const ids = new Set();
  for (const c of input.cases) {
    requireThat(
      /^[a-zA-Z0-9_-]{1,48}$/.test(c.id) && !ids.has(c.id),
      "invalid_case_id",
    );
    ids.add(c.id);
    requireThat(["real", "synthetic"].includes(c.kind), "invalid_case_kind");
    requireThat(
      languages.includes(c.lang) &&
        (c.country == null || /^[A-Z]{2}$/.test(c.country)),
      "invalid_locale",
    );
    requireThat(
      c.input &&
        (typeof c.input.text === "string" ||
          typeof c.input.imagePath === "string"),
      "missing_input",
    );
    requireThat(
      !c.input.text || c.input.text.length <= 18000,
      "input_too_large",
    );
    requireThat(
      !c.sourceUrl || publicReference(c.sourceUrl),
      "invalid_source_url",
    );
    if (c.expectedStatus !== undefined)
      requireThat(
        statuses.includes(c.expectedStatus),
        "invalid_expected_status",
      );
    if (c.humanReference !== undefined) {
      requireThat(
        publicReference(c.humanReference.url) &&
          Number.isFinite(Date.parse(c.humanReference.checkedAt)) &&
          c.humanReference.reviewed === true,
        "invalid_human_reference",
      );
    }
    if (c.expectedFields !== undefined) {
      requireThat(
        Array.isArray(c.expectedFields) &&
          (c.expectedFields.length > 0 ||
            ["review", "unavailable"].includes(c.expectedStatus)),
        "invalid_expected_fields",
      );
      for (const f of c.expectedFields)
        requireThat(
          keys.includes(f.key) &&
            textOrNull(f.before) &&
            textOrNull(f.after) &&
            textOrNull(f.beforeQuote) &&
            textOrNull(f.afterQuote) &&
            (f.verified === undefined || typeof f.verified === "boolean") &&
            (f.verified !== false
              ? typeof f.afterQuote === "string"
              : ["review", "unavailable"].includes(c.expectedStatus)),
          "invalid_expected_field",
        );
    }
  }
  return input.cases;
}

// This is reference agreement, not a general safety or correctness certification.
export function scoreResult(c, result, { fixture = false } = {}) {
  validateCases({ version: 1, cases: [c] });
  const score = {
    verdict: "not_scored",
    scoreScope: "none",
    fieldMatches: [],
    quoteMatches: [],
  };
  const nondefinitive = ["review", "unavailable"].includes(c.expectedStatus);
  if (
    fixture ||
    c.kind !== "real" ||
    !c.humanReference ||
    !c.expectedStatus ||
    (!nondefinitive && !c.expectedFields?.length)
  )
    return score;
  const fields = c.expectedFields ?? [];
  score.scoreScope = fields.length
    ? "status_and_expected_fields"
    : "status_only";
  const comparisons = Array.isArray(result.comparisons)
    ? result.comparisons
    : [];
  for (const f of fields) {
    const matches = comparisons.filter(
      (a) =>
        a.key === f.key &&
        a.before === f.before &&
        a.after === f.after &&
        a.verified === (f.verified ?? true),
    );
    score.fieldMatches.push({ key: f.key, matched: matches.length > 0 });
    const quoted = matches.some(
      (a) =>
        a.beforeQuote === f.beforeQuote &&
        a.afterQuote === f.afterQuote &&
        (f.afterQuote === null ||
          result.sources?.some(
            (s) => s.id === a.sourceId && s.url === c.humanReference.url,
          )),
    );
    score.quoteMatches.push({ key: f.key, matched: quoted });
  }
  score.verdict =
    result.status === c.expectedStatus &&
    score.fieldMatches.every((f) => f.matched) &&
    score.quoteMatches.every((f) => f.matched)
      ? "pass"
      : "fail";
  return score;
}

async function payloadFor(c, directory) {
  const body = { text: c.input.text || "", country: c.country ?? null };
  if (c.input.imagePath) {
    const bytes = await readFile(resolve(directory, c.input.imagePath));
    requireThat(bytes.length > 0 && bytes.length <= 2900000, "image_size");
    const mime = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216
        ? "jpeg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
    requireThat(mime, "image_format");
    body.image = `data:image/${mime};base64,${bytes.toString("base64")}`;
  }
  requireThat(body.text.trim() || body.image, "missing_input");
  return body;
}

export async function readEvents(response, onEvent) {
  requireThat(
    response.headers.get("content-type")?.includes("application/x-ndjson"),
    "stream_format",
  );
  requireThat(response.body, "missing_stream");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    bytes = 0;
  const line = (s) => {
    if (s.trim()) {
      let event;
      try {
        event = JSON.parse(s);
      } catch {
        throw new Failure("invalid_stream_json");
      }
      onEvent(event);
    }
  };
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      requireThat(bytes <= 2000000, "stream_too_large");
      buffer += decoder.decode(part.value, { stream: true });
      let at;
      while ((at = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, at));
        buffer = buffer.slice(at + 1);
      }
    }
    buffer += decoder.decode();
    line(buffer);
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function runEvaluation({
  url,
  cases,
  casesDirectory = ".",
  execute = false,
  fixture = false,
  onRecord = async () => {},
}) {
  const origin = new URL(url);
  requireThat(
    !origin.username &&
      !origin.password &&
      origin.pathname === "/" &&
      !origin.search &&
      !origin.hash,
    "invalid_origin",
  );
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    origin.hostname,
  );
  requireThat(
    origin.protocol === "https:" || (origin.protocol === "http:" && loopback),
    "https_required",
  );
  requireThat(!fixture || loopback, "fixture_requires_loopback");
  validateCases({ version: 1, cases });
  const report = {
    version: 1,
    mode: execute ? (fixture ? "http_fixture" : "live") : "dry_run",
    startedAt: new Date().toISOString(),
    deploymentSha: null,
    model: null,
    cost: "not_measured",
    tokens: "not_measured",
    ttlExpiry: "not_waited_or_verified",
    records: [],
    summary: {},
  };
  if (!execute) {
    report.summary = {
      plannedCases: cases.length,
      networkRequests: 0,
      scoredCases: 0,
    };
    return report;
  }
  requireThat(
    cases.length > 0 && (fixture || cases.every((c) => c.kind === "real")),
    "real_cases_required",
  );
  // Validate/read all private input before spending anything. Never save it to the report.
  const payloads = await Promise.all(
    cases.map((c) => payloadFor(c, casesDirectory)),
  );
  let lastStart = 0;
  const request = async (path, cookie, method = "GET", body) => {
    if (method === "POST" && !fixture) {
      const wait = 7000 - (Date.now() - lastStart);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastStart = Date.now();
    }
    return fetch(new URL(path, origin), {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(190000),
      headers: {
        Origin: origin.origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };
  const ensureHTTP = (r) => {
    if (!r.ok)
      throw new Failure(
        r.status === 429 ? "rate_limit_stop" : `http_${r.status}`,
      );
  };
  const session = async () => {
    const r = await request("/api/status");
    ensureHTTP(r);
    const cookie = r.headers
      .get("set-cookie")
      ?.match(/(?:^|,\s*)sv_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    requireThat(cookie, "missing_session");
    return { cookie: `sv_session=${cookie}`, status: await r.json() };
  };
  let owner, stranger;
  try {
    owner = await session();
    stranger = await session();
    requireThat(owner.cookie !== stranger.cookie, "sessions_not_distinct");
    requireThat(owner.status.liveAvailable === true, "live_unavailable");
    report.deploymentSha = /^[a-f0-9]{7,64}$/i.test(
      owner.status.deploymentSha || "",
    )
      ? owner.status.deploymentSha
      : null;
    const model = owner.status.model;
    report.model =
      typeof model === "string" && /^[a-zA-Z0-9._/-]{1,100}$/.test(model)
        ? model
        : null;
  } catch (e) {
    report.summary = {
      stopped: true,
      error: e instanceof Failure ? e.code : "transport_or_response_error",
      scoredCases: 0,
    };
    return report;
  }
  for (const [index, c] of cases.entries()) {
    const start = Date.now();
    let id, result;
    const record = {
      caseId: c.id,
      kind: c.kind,
      lang: c.lang,
      inputMode: c.input.imagePath ? "image" : "text",
      search: c.sourceUrl
        ? "bypassed_direct_url"
        : "requested_not_yet_observed",
      actualStatus: null,
      verdict: "not_scored",
      scoreScope: "none",
      fieldMatches: [],
      quoteMatches: [],
      elapsedMs: null,
      expiresAt: null,
      isolation: "not_tested",
      deletion: "not_tested",
      success: false,
    };
    try {
      const extracted = await request(
        "/api/extract",
        owner.cookie,
        "POST",
        payloads[index],
      );
      ensureHTTP(extracted);
      const { notice } = await extracted.json();
      requireThat(notice && typeof notice === "object", "missing_notice");
      // One stable key for this attempt. No automatic paid-request retry, even on uncertain transport failure.
      const checked = await request("/api/checks", owner.cookie, "POST", {
        notice,
        country: c.country ?? null,
        lang: c.lang,
        sourceUrl: c.sourceUrl || "",
        requestKey: randomUUID(),
      });
      ensureHTTP(checked);
      await readEvents(checked, (event) => {
        if (event.type === "created") {
          requireThat(
            /^[a-zA-Z0-9_-]{1,100}$/.test(event.data?.id),
            "invalid_result_id",
          );
          id = event.data.id;
        }
        if (event.type === "error") throw new Failure("stream_error");
        if (event.type === "result") {
          requireThat(!result, "duplicate_result");
          result = event.data;
        }
      });
      requireThat(
        id &&
          result?.id === id &&
          result.mode === "live" &&
          statuses.includes(result.status),
        "incomplete_live_result",
      );
      record.actualStatus = result.status;
      record.search = c.sourceUrl
        ? "bypassed_direct_url"
        : result.warnings?.some((w) => ["search", "budget"].includes(w))
          ? "requested_with_failure_warning"
          : "requested_no_failure_warning";
      record.expiresAt = Number.isFinite(Date.parse(result.expiresAt))
        ? result.expiresAt
        : null;
      const path = `/api/checks/${encodeURIComponent(id)}`;
      const own = await request(path, owner.cookie);
      ensureHTTP(own);
      const stored = await own.json();
      requireThat(
        stored.state === "complete" &&
          stored.result?.id === id &&
          stored.result.status === result.status,
        "stored_result_mismatch",
      );
      const foreignGet = await request(path, stranger.cookie);
      const foreignDelete = await request(path, stranger.cookie, "DELETE");
      const stillOwned = await request(path, owner.cookie);
      requireThat(
        foreignGet.status === 404 &&
          foreignDelete.status === 404 &&
          stillOwned.ok,
        "isolation_failed",
      );
      record.isolation = "passed";
      Object.assign(record, scoreResult(c, result, { fixture }));
      record.success = true;
    } catch (e) {
      record.error =
        e instanceof Failure ? e.code : "transport_or_response_error";
    } finally {
      if (id) {
        try {
          const path = `/api/checks/${encodeURIComponent(id)}`;
          const deleted = await request(path, owner.cookie, "DELETE");
          const absent = await request(path, owner.cookie);
          record.deletion =
            deleted.status === 204 && absent.status === 404
              ? "passed"
              : "failed";
        } catch {
          record.deletion = "failed";
        }
        if (record.deletion !== "passed") record.success = false;
      }
      record.elapsedMs = Date.now() - start;
      report.records.push(record);
      await onRecord(report);
    }
    if (!record.success) break;
  }
  const scored = report.records.filter((r) => r.verdict !== "not_scored");
  report.summary = {
    attempted: report.records.length,
    planned: cases.length,
    completed: report.records.filter((r) => r.success).length,
    scoredCases: scored.length,
    passedCases: scored.filter((r) => r.verdict === "pass").length,
    stopped:
      report.records.length < cases.length ||
      report.records.some((r) => !r.success),
  };
  return report;
}

async function main() {
  const args = process.argv.slice(2),
    opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    requireThat(
      ["--url", "--cases", "--output", "--execute", "--fixture"].includes(arg),
      "invalid_argument",
    );
    if (arg === "--execute" || arg === "--fixture") opts[arg.slice(2)] = true;
    else {
      requireThat(
        args[i + 1] && !args[i + 1].startsWith("--"),
        "missing_argument",
      );
      opts[arg.slice(2)] = args[++i];
    }
  }
  requireThat(opts.url && opts.cases, "usage_requires_url_and_cases");
  const casesPath = resolve(opts.cases),
    output = resolve(opts.output || ".data/evaluation/report.json");
  const input = JSON.parse(await readFile(casesPath, "utf8"));
  const cases = validateCases(input);
  const save = async (report) => {
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
  };
  const report = await runEvaluation({
    ...opts,
    cases,
    casesDirectory: dirname(casesPath),
    onRecord: save,
  });
  await save(report);
  console.log(JSON.stringify({ mode: report.mode, ...report.summary }));
  if (
    report.summary.stopped ||
    report.summary.passedCases < report.summary.scoredCases
  )
    process.exitCode = 1;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((e) => {
    console.error(
      JSON.stringify({
        error: e instanceof Failure ? e.code : "input_or_runtime_error",
      }),
    );
    process.exitCode = 1;
  });
}
