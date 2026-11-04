// Browser check for request deadlines, stream silence and result preservation,
// following the audit's reproduction method: fixed fetch responses inside the
// page and a controlled browser clock. No model, search or source request.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const notice = {
  title: "Audit fixture",
  institution: "Example Library",
  edition: null,
  country: null,
  originalText: "Audit fixture. Deadline: 4 November 2026.",
  fields: [
    {
      key: "deadline",
      value: "4 November 2026",
      quote: "Deadline: 4 November 2026.",
    },
  ],
};
const result = {
  id: "fixture-audit",
  mode: "live",
  status: "review",
  title: notice.title,
  institution: notice.institution,
  country: null,
  checkedAt: "2026-11-04T08:00:00Z",
  expiresAt: null,
  comparisons: [],
  sources: [],
  candidates: [],
  warnings: ["partial"],
  lang: "en",
  elapsedMs: 20,
};
const results = [];
const pageErrors = [];

async function open(mode) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(mode + ": " + e.message));
  await page.clock.install();
  await context.addInitScript(
    ({ mode, result, notice }) => {
      localStorage.setItem("sv_display_lang", "en");
      window.__checks = 0;
      window.__recoveries = 0;
      const original = window.fetch;
      const encode = (type, data) =>
        new TextEncoder().encode(JSON.stringify({ type, data }) + "\n");
      window.fetch = async (...args) => {
        const url = String(args[0]);
        const method = args[1]?.method || "GET";
        if (url === "/api/status")
          return Response.json({ liveAvailable: true, demoAvailable: true });
        if (url === "/api/extract") {
          if (mode === "extract_stall")
            return new Response(new ReadableStream({ start() {} }), {
              headers: { "Content-Type": "application/json" },
            });
          return Response.json({ notice });
        }
        if (url === "/api/checks/" + result.id && method === "GET") {
          window.__recoveries++;
          return mode === "broken_then_saved"
            ? Response.json({ state: "complete", result })
            : Response.json({ error: "not_found" }, { status: 404 });
        }
        if (url === "/api/checks" && method === "POST") {
          window.__checks++;
          return new Response(
            new ReadableStream({
              start(ctrl) {
                ctrl.enqueue(encode("created", { id: result.id }));
                ctrl.enqueue(encode("phase", { step: "compare" }));
                if (mode === "result_then_error") {
                  ctrl.enqueue(encode("result", result));
                  setTimeout(
                    () => ctrl.error(new TypeError("synthetic body failure")),
                    500,
                  );
                }
                if (mode === "result_never_closes")
                  ctrl.enqueue(encode("result", result));
                if (mode === "broken_then_saved")
                  setTimeout(
                    () => ctrl.error(new TypeError("synthetic disconnect")),
                    500,
                  );
                if (mode === "slow_with_heartbeat") {
                  // A 100-second comparison that sends a ping every 10 s.
                  const ping = setInterval(
                    () => ctrl.enqueue(encode("ping", {})),
                    10000,
                  );
                  setTimeout(() => {
                    clearInterval(ping);
                    ctrl.enqueue(encode("result", result));
                    ctrl.close();
                  }, 100000);
                }
              },
            }),
            { headers: { "Content-Type": "application/x-ndjson" } },
          );
        }
        return original(...args);
      };
    },
    { mode, result, notice },
  );
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#text-tab").click();
  await page.locator("textarea").first().fill(notice.originalText);
  await page.locator(".start-button").click();
  if (mode !== "extract_stall") {
    await page.locator(".review-card").waitFor();
    await page.locator(".review-card button.primary").click();
  }
  return { context, page };
}
const timeoutText = "This took too long, so we stopped waiting.";

// 1. A stalled extraction ends at the browser deadline; the text is kept.
{
  const { context, page } = await open("extract_stall");
  await page.clock.runFor(149000);
  assert.equal(await page.locator(".progress-screen").count(), 1);
  await page.clock.runFor(2000);
  await page.getByText(timeoutText, { exact: false }).waitFor();
  assert.equal(await page.locator(".progress-screen").count(), 0);
  assert.equal(
    await page.locator("textarea").first().inputValue(),
    notice.originalText,
  );
  results.push("extract stall: ends at 150 s with input kept (was endless)");
  await context.close();
}

// 2. A silent check stream ends after 45 s without bytes; recovery is tried.
{
  const { context, page } = await open("check_stall");
  await page.clock.runFor(44000);
  assert.equal(await page.locator(".progress-screen").count(), 1);
  await page.clock.runFor(2000);
  await page.getByText(timeoutText, { exact: false }).waitFor();
  await page.locator(".review-card").waitFor();
  assert.equal(await page.evaluate(() => window.__recoveries), 1);
  results.push(
    "check stall: silence watchdog ends at 45 s, recovery tried (was endless)",
  );
  await context.close();
}

// 3. A heartbeat keeps a slow but working check alive past the watchdog.
{
  const { context, page } = await open("slow_with_heartbeat");
  await page.clock.runFor(99000);
  assert.equal(await page.locator(".progress-screen").count(), 1);
  await page.clock.runFor(2000);
  await page.locator(".result-container").waitFor();
  assert.equal(await page.getByText(timeoutText, { exact: false }).count(), 0);
  results.push(
    "100 s check with 10 s heartbeats completes without a false timeout",
  );
  await context.close();
}

// 4. A transport error after the result keeps the result.
{
  const { context, page } = await open("result_then_error");
  await page.locator(".result-container").waitFor();
  await page.clock.runFor(1000);
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".result-container").count(), 1);
  assert.equal(await page.locator(".review-card").count(), 0);
  results.push("result then body error: result kept (was returned to review)");
  await context.close();
}

// 5. A stream that never closes after the result does not block a recheck.
{
  const { context, page } = await open("result_never_closes");
  await page.locator(".result-container").waitFor();
  await page
    .getByRole("button", { name: "Run a fresh check", exact: true })
    .click();
  await page.clock.runFor(1000);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__checks), 2);
  results.push("result without EOF: fresh check runs (was blocked)");
  await context.close();
}

// 6. A broken stream whose check was saved recovers the saved result.
{
  const { context, page } = await open("broken_then_saved");
  await page.clock.runFor(1000);
  await page.locator(".result-container").waitFor();
  assert.equal(await page.evaluate(() => window.__recoveries), 1);
  assert.equal(await page.evaluate(() => window.__checks), 1);
  results.push(
    "broken stream with a saved result: recovered without a new check",
  );
  await context.close();
}

assert.deepEqual(pageErrors, []);
await browser.close();
console.log(JSON.stringify({ checks: results, pageErrors }, null, 2));
