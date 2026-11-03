import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const screenshots =
  process.env.SCREENSHOT_DIR || "/workspace/scratch/stillvalid-qa";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [],
  violations = [],
  errors = [];
async function audit(page, label) {
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  for (const v of report.violations)
    violations.push({
      page: label,
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    });
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    locale: "ko-KR",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  assert.match(await page.title(), /StillValid/);
  await audit(page, "desktop home");
  await page.screenshot({ path: screenshots + "/desktop.png", fullPage: true });
  results.push("desktop home");
  await page.getByRole("button", { name: /공고 국가/ }).click();
  await page.getByRole("textbox", { name: "국가 이름 검색" }).fill("미국");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /US미국|US 미국/ }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("sv_country")),
    "US",
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.match(
    await page.getByRole("button", { name: /공고 국가/ }).innerText(),
    /미국/,
  );
  await page.getByRole("button", { name: /공고 국가/ }).click();
  await page.getByRole("button", { name: "기억한 국가 지우기" }).click();
  await page.getByRole("button", { name: "Close / 닫기" }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("sv_country")),
    null,
  );
  results.push("optional country, opt-in memory, reload and clear");
  await page.getByRole("button", { name: "신청 기한이 바뀌었다면?" }).click();
  await page.getByRole("heading", { name: "달라진 내용을 찾았어요" }).waitFor();
  assert.ok(await page.getByText("합성 예제", { exact: true }).isVisible());
  await page.getByText("이 내용의 근거 보기", { exact: true }).first().click();
  assert.ok(
    await page
      .getByText("신청 마감: 2026년 11월 10일", { exact: true })
      .isVisible(),
  );
  await audit(page, "changed example result");
  await page.screenshot({ path: screenshots + "/result.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.getByRole("heading", { name: "We found a few changes" }).waitFor();
  assert.ok(
    await page.getByText("2026년 11월 10일", { exact: true }).isVisible(),
  );
  results.push("example comparison, evidence, language switch preserves facts");
  await page
    .getByRole("button", { name: "Check another notice", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "When an event is cancelled" })
    .click();
  await page
    .getByRole("heading", { name: "A cancellation is documented" })
    .waitFor();
  await page
    .getByRole("button", { name: "Check another notice", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "When it's a different edition" })
    .click();
  await page
    .getByRole("heading", { name: "This needs another look" })
    .waitFor();
  results.push("explicit cancellation and mismatched edition examples");
  await page
    .getByRole("button", { name: "Delete this result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete result", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "What would you like to check?" })
    .waitFor();
  results.push("result deletion flow");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 700;
    c.height = 900;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 700, 900);
    x.fillStyle = "#222";
    x.font = "32px Arial";
    x.fillText("SYNTHETIC NOTICE", 60, 120);
    x.fillText("Workshop 2026", 60, 180);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "synthetic-notice.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await page.getByRole("img", { name: "Preview of your notice" }).waitFor();
  await page.getByRole("button", { name: "Crop", exact: true }).click();
  await page.getByRole("button", { name: "Use this crop" }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page
    .getByRole("button", { name: "Rotate", exact: true })
    .waitFor({ state: "visible" });
  results.push("real image upload, crop and rotate");
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page
    .getByRole("textbox", { name: "Paste text" })
    .fill("Synthetic workshop 2026. Apply by 4 November. Example Library.");
  const status = await page.request.get(origin + "/api/status");
  const readiness = await status.json();
  if (!readiness.liveAvailable) {
    await page
      .getByRole("button", { name: "Read this notice", exact: true })
      .click();
    assert.ok(await page.locator(".inline-error").isVisible());
    results.push(
      "unconfigured live path fails clearly without a simulated result",
    );
  }
  // UI integration with explicit HTTP fixtures: no real model or web call.
  const fakeNotice = {
    title: "Synthetic workshop",
    institution: "Example Library",
    edition: "2026",
    country: "GB",
    originalText:
      "Synthetic workshop 2026. Apply by 4 November. Example Library.",
    fields: [
      { key: "deadline", value: "4 November", quote: "Apply by 4 November." },
    ],
  };
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({ json: { notice: fakeNotice } }),
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Notice country/ }).click();
  await page
    .getByRole("textbox", { name: "Search countries" })
    .fill("United States");
  await page
    .getByRole("button", { name: /USUnited States|US United States/ })
    .click();
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page
    .getByRole("textbox", { name: "Paste text" })
    .fill(fakeNotice.originalText);
  await page
    .getByRole("button", { name: "Read this notice", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Is this the right notice?" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Check official sources", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Use the notice country", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Check official sources", exact: true })
      .isDisabled(),
    false,
  );
  await audit(page, "extraction review with HTTP fixture");
  results.push("HTTP-fixture extraction and country mismatch confirmation");
  const fixtureResult = await (
    await page.request.get(origin + "/api/demo?id=deadline&lang=en")
  ).json();
  fixtureResult.result.mode = "live";
  fixtureResult.result.id = "fixture-check-id";
  await page.route("**/api/checks", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body:
        [
          { type: "created", data: { id: "fixture-check-id" } },
          { type: "phase", data: { step: "sources" } },
          { type: "phase", data: { step: "compare" } },
          { type: "result", data: fixtureResult.result },
        ]
          .map((x) => JSON.stringify(x))
          .join("\n") + "\n",
    }),
  );
  await page
    .getByRole("button", { name: "Check official sources", exact: true })
    .click();
  await page.getByRole("heading", { name: "We found a few changes" }).waitFor();
  results.push("HTTP-fixture NDJSON progress and result integration");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(origin, { waitUntil: "networkidle" });
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await audit(phone, "mobile home");
  await phone.screenshot({ path: screenshots + "/mobile.png", fullPage: true });
  await phone.getByRole("button", { name: "신청 기한이 바뀌었다면?" }).click();
  await phone
    .getByRole("heading", { name: "달라진 내용을 찾았어요" })
    .waitFor();
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await audit(phone, "mobile result");
  results.push("390px touch viewport and result without horizontal overflow");
  await phone.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  results.push("360px result without horizontal overflow");
  console.log(
    JSON.stringify(
      { checks: results, errors, violations, screenshots },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, [], "browser runtime errors");
  assert.deepEqual(violations, [], "accessibility violations");
} catch (error) {
  console.log(
    JSON.stringify({ completed: results, errors, violations }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
