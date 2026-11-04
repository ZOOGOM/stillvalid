// Browser check for the link printed on a notice: a public body's address is
// offered in the link field with a notice, a typed link is never replaced, and
// other printed links are not offered. Fixed /api/extract responses; no model
// call is made.
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";

const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
const violations = [];
const pageErrors = [];
const notice = (text) => ({
  title: "Fixture festival",
  institution: "Fixture County",
  edition: null,
  country: "KR",
  originalText: text,
  fields: [],
});

async function read(text, typed = "") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({ json: { notice: notice(text) } }),
  );
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sv_display_lang", "en");
    } catch {}
  });
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#text-tab").click();
  await page.locator("textarea").first().fill(text);
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  const field = page.locator('.url-input input[type="url"]');
  if (typed) await field.fill(typed);
  return { context, page, field };
}
const hint = "We filled in the link printed on the notice.";

{
  const { context, page, field } = await read(
    "Fixture festival. Details: www.fixture.go.kr/notice/12. Tickets: www.tickets.com",
  );
  assert.equal(await field.inputValue(), "https://www.fixture.go.kr/notice/12");
  await page.getByText(hint, { exact: false }).waitFor();
  await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
    .then((r) => violations.push(...r.violations.map((v) => v.id)));
  await field.fill("https://www.fixture.go.kr/other");
  assert.equal(await page.getByText(hint, { exact: false }).count(), 0);
  // Editing the text and reading again keeps the user's own link.
  await page.locator(".review-card details.transcript summary").last().click();
  await page.getByText("Edit the text and read again").click();
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  assert.equal(await field.inputValue(), "https://www.fixture.go.kr/other");
  results.push("go.kr link offered with notice; user edit kept on re-read");
  await context.close();
}
{
  const { context, page, field } = await read(
    "Tickets https://www.tickets.com/fest and instagram.com/fest",
  );
  assert.equal(await field.inputValue(), "");
  assert.equal(await page.getByText(hint, { exact: false }).count(), 0);
  results.push("ticket and social links not offered");
  await context.close();
}

assert.deepEqual(violations, []);
assert.deepEqual(pageErrors, []);
await browser.close();
console.log(
  JSON.stringify({ checks: results, violations, pageErrors }, null, 2),
);
