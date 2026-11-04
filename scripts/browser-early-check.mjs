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

async function open({ text, readability, region }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      json: {
        notice: { ...base, originalText: text },
        ...(readability ? { readability } : {}),
      },
    }),
  );
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
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  return { context, page, posts };
}
const note = "checking against the official page has already started";

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
// 3. No link, uncertain reading, or region mismatch: nothing starts early.
for (const [label, opts] of [
  ["no link", { text: "Fixture festival. No address here." }],
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

assert.deepEqual(violations, []);
assert.deepEqual(pageErrors, []);
await browser.close();
console.log(
  JSON.stringify({ checks: results, violations, pageErrors }, null, 2),
);
