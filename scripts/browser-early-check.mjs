// Browser check for the background check that starts while the user reviews
// the reading: it is used when nothing changed, dropped when a field is edited,
// and not started without a link, with an uncertain reading or on a region
// mismatch. Fixed fetch responses; no model call is made.
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";

const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const violations = [];
const pageErrors = [];
const results = [];
const base = {
  title: "Fixture festival",
  institution: "Fixture County",
  edition: null,
  country: "KR",
  originalText: "Fixture festival. Details: www.fixture.go.kr/notice/12",
  fields: [],
};
const result = {
  id: "fixture-early",
  mode: "live",
  status: "review",
  title: base.title,
  institution: base.institution,
  country: null,
  checkedAt: "2026-11-04T08:00:00Z",
  expiresAt: null,
  comparisons: [],
  sources: [],
  candidates: [],
  warnings: [],
  lang: "en",
  elapsedMs: 20,
};

async function open({ text, readability, region, freeze }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  let reads = 0;
  await page.route("**/api/extract", (route) => {
    reads++;
    return route.fulfill({
      json: {
        notice: { ...base, originalText: text },
        ...(readability ? { readability } : {}),
      },
    });
  });
  const posts = [];
  await page.route("**/api/checks", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts.push(JSON.parse(route.request().postData()));
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
      body:
        JSON.stringify({ type: "created", data: { id: result.id } }) +
        "\n" +
        JSON.stringify({ type: "result", data: result }) +
        "\n",
    });
  });
  await page.addInitScript((region) => {
    try {
      localStorage.setItem("sv_display_lang", "en");
      if (region) {
        localStorage.setItem("sv_remember_country", "true");
        localStorage.setItem("sv_country", region);
      }
    } catch {}
  }, region);
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#text-tab").click();
  await page.locator("textarea").first().fill(text);
  if (freeze) {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
  }
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  return { context, page, posts, reads: () => reads };
}
const note = "the check has already started in the background";

// 1. Link printed on the notice: the check starts at once and is reused.
{
  const { context, page, posts } = await open({ text: base.originalText });
  await page.getByText(note, { exact: false }).waitFor();
  assert.equal(posts.length, 1, "started before the click");
  assert.equal(posts[0].sourceUrl, "https://www.fixture.go.kr/notice/12");
  await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
    .then((r) => violations.push(...r.violations.map((v) => v.id)));
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 1, "reused: no second request");
  results.push("printed link: check starts before the click and is reused");
  await context.close();
}
// 2. Editing a field drops it; the button starts a normal check.
{
  const { context, page, posts } = await open({ text: base.originalText });
  await page.getByText(note, { exact: false }).waitFor();
  await page.locator(".review-card input").first().fill("Edited");
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 2, "edited: a fresh check runs");
  assert.equal(posts[1].notice.title, "Edited");
  results.push("edited notice: early check dropped, fresh check sent");
  await context.close();
}
// 3. No link: the check (with its source search) also starts early and is reused.
{
  const { context, page, posts } = await open({
    text: "Fixture festival. No address here.",
  });
  await page.getByText(note, { exact: false }).waitFor();
  assert.equal(posts.length, 1, "no link: started before the click");
  assert.equal(posts[0].sourceUrl, "");
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 1, "no link: reused");
  results.push("no link: early check (with search) reused");
  await context.close();
}
// 4. Typing a link after an early no-link check drops it.
{
  const { context, page, posts } = await open({
    text: "Fixture festival. No address here.",
  });
  await page.getByText(note, { exact: false }).waitFor();
  await page
    .locator('.url-input input[type="url"]')
    .fill("https://www.fixture.go.kr/typed");
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 2, "typed link: fresh check");
  assert.equal(posts[1].sourceUrl, "https://www.fixture.go.kr/typed");
  results.push("link typed after an early check: dropped, fresh check sent");
  await context.close();
}
// 5. Uncertain reading or region mismatch: nothing starts early.
for (const [label, opts] of [
  ["uncertain reading", { text: base.originalText, readability: "uncertain" }],
  ["region mismatch", { text: base.originalText, region: "US" }],
]) {
  const { context, page, posts } = await open(opts);
  await page.waitForTimeout(500);
  assert.equal(posts.length, 0, label + ": nothing started");
  assert.equal(await page.getByText(note, { exact: false }).count(), 0);
  results.push(label + ": not started early");
  await context.close();
}

// Edits made during the debounce cancel the request before it costs a call.
{
  const { context, page, posts } = await open({
    text: base.originalText,
    freeze: true,
  });
  await page.locator(".review-card input").first().fill("Edited immediately");
  await page.clock.runFor(500);
  assert.equal(
    posts.length,
    0,
    "discarded reading does not start background work",
  );
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].notice.title, "Edited immediately");
  results.push("debounce: an immediate edit prevents the discarded request");
  await context.close();
}
// Display language does not restart factual verification.
{
  const { context, page, posts } = await open({ text: base.originalText });
  await page.getByText(note, { exact: false }).waitFor();
  await page.locator(".language-button").click();
  await page.locator(".settings-language-fields select").selectOption("es");
  await page.locator(".modal-heading .icon-button").click();
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  assert.equal(posts.length, 1, "language changes reuse existing evidence");
  results.push("display language change: no new model request");
  await context.close();
}
// Returning to the same clear reading reuses OCR only; checking remains fresh.
{
  const { context, page, reads } = await open({ text: base.originalText });
  await page.locator("details.transcript").evaluate((el) => (el.open = true));
  await page.locator("details.transcript button").click();
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  assert.equal(reads(), 1, "identical input does not re-extract");
  await page.locator("details.transcript").evaluate((el) => (el.open = true));
  await page.locator("details.transcript button").click();
  await page
    .locator("textarea")
    .first()
    .fill(base.originalText + " Changed.");
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  assert.equal(reads(), 2, "changed input must re-extract");
  results.push("reading cache: exact input reused, changed input invalidated");
  await context.close();
}

assert.deepEqual(violations, []);
assert.deepEqual(pageErrors, []);
await browser.close();
console.log(
  JSON.stringify({ checks: results, violations, pageErrors }, null, 2),
);
