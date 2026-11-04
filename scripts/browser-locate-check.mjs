// Browser check for the opt-in "find the notice" crop with fixed /api/locate
// responses: several notices to choose from, exactly one, and none. No model
// call is made.
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
const results = [];
const violations = [];
const pageErrors = [];

// A 600×400 PNG with two light "sheets" on a dark background.
async function photo(page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#4a3f33";
    ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(40, 40, 220, 300);
    ctx.fillRect(330, 60, 230, 280);
    return canvas.toDataURL("image/png").split(",")[1];
  });
}
const box = (x1, y1, x2, y2, c) => ({ x1, y1, x2, y2, w: 600, h: 400, c });

async function open(locate, width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  let calls = 0;
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/locate", (route) => {
    calls++;
    return route.fulfill({ json: locate });
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sv_display_lang", "en");
    } catch {}
  });
  await page.goto(origin, { waitUntil: "networkidle" });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "board.png",
      mimeType: "image/png",
      buffer: Buffer.from(await photo(page), "base64"),
    });
  await page.locator(".image-preview > img").waitFor();
  return { page, calls: () => calls };
}
const preview = (page) =>
  page.locator(".image-preview > img").getAttribute("src");

// Several notices: the user chooses one; nothing is cropped before that.
{
  const { page, calls } = await open({
    box: box(40, 40, 260, 340, 0.9),
    boxes: [box(40, 40, 260, 340, 0.9), box(330, 60, 560, 340, 0.8)],
  });
  const original = await preview(page);
  await page
    .getByRole("button", { name: "Find the notice automatically" })
    .click();
  await page
    .getByRole("group", {
      name: "Several notices were found. Choose the one to check.",
    })
    .waitFor();
  assert.equal(await preview(page), original, "not cropped before choosing");
  const choices = page.locator(".notice-choice-image button");
  assert.equal(await choices.count(), 2);
  for (const b of await choices.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().toJSON()),
  ))
    assert.ok(b.width >= 44 && b.height >= 44, "44px choice targets");
  await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
    .then((r) => violations.push(...r.violations.map((v) => v.id)));
  await page.screenshot({
    path: `${screenshots}/locate-choice.png`,
    fullPage: true,
  });
  // Keyboard: Tab to the second choice and press Enter.
  await page.getByRole("button", { name: "Choose notice 2" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Undo automatic crop" }).waitFor();
  assert.notEqual(await preview(page), original, "cropped after choosing");
  assert.equal(await page.locator(".notice-choice").count(), 0);
  const cropped = await page.evaluate(
    async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    },
    await preview(page),
  );
  // Box 2 is 230×280 plus a 2% margin on each side.
  assert.ok(cropped[0] >= 230 && cropped[0] <= 260, String(cropped));
  assert.ok(cropped[1] >= 280 && cropped[1] <= 300, String(cropped));
  await page.getByRole("button", { name: "Undo automatic crop" }).click();
  assert.equal(await preview(page), original, "undo restores the photo");
  assert.equal(calls(), 1);
  results.push("several notices: choice of 2, keyboard pick crops box 2, undo");
  await page.close();
}

// Cancel keeps the photo.
{
  const { page } = await open({
    box: box(40, 40, 260, 340, 0.9),
    boxes: [box(40, 40, 260, 340, 0.9), box(330, 60, 560, 340, 0.8)],
  });
  const original = await preview(page);
  await page
    .getByRole("button", { name: "Find the notice automatically" })
    .click();
  await page.locator(".notice-choice").waitFor();
  await page.locator(".notice-choice .text-button").click();
  assert.equal(await page.locator(".notice-choice").count(), 0);
  assert.equal(await preview(page), original);
  results.push("several notices: cancel keeps the photo");
  await page.close();
}

// Exactly one notice: cropped directly, no choice panel.
{
  const { page } = await open({
    box: box(40, 40, 260, 340, 0.9),
    boxes: [box(40, 40, 260, 340, 0.9)],
  });
  const original = await preview(page);
  await page
    .getByRole("button", { name: "Find the notice automatically" })
    .click();
  await page.getByRole("button", { name: "Undo automatic crop" }).waitFor();
  assert.notEqual(await preview(page), original);
  assert.equal(await page.locator(".notice-choice").count(), 0);
  results.push("one notice: cropped directly");
  await page.close();
}

// None: the photo is unchanged and the user is told.
{
  const { page } = await open({ box: null, boxes: [] });
  const original = await preview(page);
  await page
    .getByRole("button", { name: "Find the notice automatically" })
    .click();
  await page
    .getByText("No notice area was found. Please crop it yourself.")
    .waitFor();
  assert.equal(await preview(page), original);
  results.push("no notice: message, photo unchanged");
  await page.close();
}

// Narrow screen: the choice panel does not overflow.
{
  const { page } = await open(
    {
      box: box(40, 40, 260, 340, 0.9),
      boxes: [box(40, 40, 260, 340, 0.9), box(330, 60, 560, 340, 0.8)],
    },
    320,
  );
  await page
    .getByRole("button", { name: "Find the notice automatically" })
    .click();
  await page.locator(".notice-choice").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  assert.ok(overflow <= 0, "320px overflow " + overflow);
  results.push("320px choice panel without overflow");
  await page.close();
}

// A HEIC photo on a browser that cannot decode HEIC (Chromium) gets the
// HEIC guidance rather than a generic type error. Real Safari decoding is not
// covered here.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sv_display_lang", "en");
    } catch {}
  });
  await page.goto(origin, { waitUntil: "networkidle" });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "IMG_0001.HEIC",
      mimeType: "image/heic",
      buffer: Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from("ftypheic"),
        Buffer.alloc(64),
      ]),
    });
  await page
    .getByText("This browser can't read HEIC photos.", { exact: false })
    .waitFor();
  assert.equal(await page.locator(".image-preview > img").count(), 0);
  results.push("HEIC on Chromium: HEIC guidance, no preview");
  await context.close();
}

assert.deepEqual(violations, []);
assert.deepEqual(pageErrors, []);
await browser.close();
console.log(
  JSON.stringify({ checks: results, violations, pageErrors }, null, 2),
);
