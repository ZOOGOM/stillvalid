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
  // Preferences are initialized independently of region and recover when storage is blocked.
  for (const scenario of [
    { locale: "ja-JP", values: {}, expected: "ja" },
    {
      locale: "ja-JP",
      values: { sv_lang: "ko", sv_result_lang: "es" },
      expected: "es",
    },
    {
      locale: "ja-JP",
      values: { sv_lang: "ko", sv_result_lang: "es", sv_display_lang: "fr" },
      expected: "fr",
    },
    {
      locale: "ja-JP",
      values: { sv_result_lang: "invalid", sv_lang: "ko" },
      expected: "ko",
    },
    { locale: "ja-JP", blocked: true, values: {}, expected: "ja" },
  ]) {
    const c = await browser.newContext({ locale: scenario.locale });
    await c.addInitScript(({ values, blocked }) => {
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(key, value);
      if (blocked)
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
    }, scenario);
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(origin, { waitUntil: "networkidle" });
    await p.locator(".language-button").click();
    assert.equal(
      await p.locator(".settings-language-fields select").count(),
      1,
    );
    assert.equal(
      await p.locator(".settings-language-fields select").inputValue(),
      scenario.expected,
    );
    if (!scenario.blocked) {
      assert.equal(
        await p.evaluate(() => localStorage.getItem("sv_display_lang")),
        scenario.expected,
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("sv_result_lang")),
        null,
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("sv_lang")),
        null,
      );
      assert.equal(
        await p.evaluate(() => localStorage.getItem("sv_country")),
        null,
      );
    }
    await c.close();
  }
  results.push(
    "browser language, legacy migration and blocked storage fallback",
  );
  // Geolocation is mocked: no prompt or external geolocation service is used.
  const gpsContext = await browser.newContext({ locale: "en-US" });
  await gpsContext.addInitScript(() => {
    window.__geo = { calls: 0, success: null, failure: null, options: null };
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition(success, failure, options) {
          window.__geo.calls++;
          window.__geo.success = success;
          window.__geo.failure = failure;
          window.__geo.options = options;
        },
      },
    });
  });
  const gps = await gpsContext.newPage();
  const gpsRequests = [];
  gps.on("request", (r) =>
    gpsRequests.push(r.url() + " " + (r.postData() || "")),
  );
  await gps.goto(origin, { waitUntil: "networkidle" });
  assert.equal(await gps.evaluate(() => window.__geo.calls), 0);
  await gps.locator(".language-button").click();
  assert.equal(await gps.evaluate(() => window.__geo.calls), 0);
  assert.equal(await gps.getByRole("checkbox").isChecked(), false);
  await gps
    .getByRole("button", { name: "Find my region from location" })
    .click();
  assert.equal(await gps.evaluate(() => window.__geo.calls), 1);
  assert.deepEqual(await gps.evaluate(() => window.__geo.options), {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000,
  });
  await gps.locator(".settings-language-fields select").selectOption("es");
  assert.ok(await gps.getByRole("status").innerText());
  await gps.locator(".settings-language-fields select").selectOption("en");
  assert.equal(
    await gps.evaluate(() => localStorage.getItem("sv_country")),
    null,
  );
  await gps.getByRole("checkbox").check();
  await gps.evaluate(() =>
    window.__geo.success({
      coords: { latitude: 37.5665, longitude: 126.978, accuracy: 100 },
    }),
  );
  await gps
    .getByRole("status")
    .filter({ hasText: /Detected region:/ })
    .waitFor();
  assert.equal(
    await gps.evaluate(() => localStorage.getItem("sv_country")),
    "KR",
  );
  assert.equal(
    await gps.locator(".settings-language-fields select").inputValue(),
    "en",
  );
  for (const [code, message] of [
    [1, /permission was denied/],
    [3, /timed out/],
    [2, /unavailable/],
  ]) {
    await gps
      .getByRole("button", { name: "Find my region from location" })
      .click();
    await gps.evaluate((code) => window.__geo.failure({ code }), code);
    await gps.getByRole("status").filter({ hasText: message }).waitFor();
  }
  await gps
    .getByRole("button", { name: "Find my region from location" })
    .click();
  await gps.evaluate(() =>
    window.__geo.success({
      coords: { latitude: 0, longitude: 0, accuracy: 100 },
    }),
  );
  await gps
    .getByRole("status")
    .filter({ hasText: /imprecise or near a border or coast/ })
    .waitFor();
  await gps
    .getByRole("button", { name: "Find my region from location" })
    .click();
  await gps.getByRole("button", { name: "Cancel location lookup" }).click();
  await gps.evaluate(() =>
    window.__geo.success({
      coords: { latitude: 38.8977, longitude: -77.0365, accuracy: 100 },
    }),
  );
  assert.equal(
    await gps.evaluate(() => localStorage.getItem("sv_country")),
    "KR",
  );
  await gps
    .getByRole("button", { name: "Find my region from location" })
    .click();
  await gps.locator(".country-search input").fill("United States");
  await gps
    .getByRole("button", { name: /USUnited States|US United States/ })
    .click();
  await gps.evaluate(() =>
    window.__geo.success({
      coords: { latitude: 37.5665, longitude: 126.978, accuracy: 100 },
    }),
  );
  assert.equal(
    await gps.evaluate(() => localStorage.getItem("sv_country")),
    "US",
  );
  await gps.locator(".language-button").click();
  await gps
    .getByRole("button", { name: "Find my region from location" })
    .click();
  await gps.locator(".modal-heading .icon-button").click();
  await gps.evaluate(() =>
    window.__geo.success({
      coords: { latitude: 37.5665, longitude: 126.978, accuracy: 100 },
    }),
  );
  assert.equal(
    await gps.evaluate(() => localStorage.getItem("sv_country")),
    "US",
  );
  assert.ok(
    gpsRequests.every((r) => !r.includes("37.5665") && !r.includes("126.978")),
  );
  await gpsContext.close();
  results.push(
    "on-demand mocked location success, errors, cancellation and local-only coordinates",
  );
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
  // Every display language must fit the narrow home page as well as results.
  for (const code of [
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "pt",
    "ar",
    "ru",
  ]) {
    await page.locator(".language-button").click();
    await page.locator(".settings-language-fields select").selectOption(code);
    await page.locator(".modal-heading .icon-button").click();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${code} home at ${width}px`,
      );
    }
  }
  await page.locator(".language-button").click();
  await page.locator(".settings-language-fields select").selectOption("ko");
  await page.locator(".modal-heading .icon-button").click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  results.push("all ten display languages fit 320px and 390px home pages");

  await page.getByRole("button", { name: /사용 지역/ }).click();
  await page.getByRole("textbox", { name: "국가 이름 검색" }).fill("미국");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /US미국|US 미국/ }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("sv_country")),
    "US",
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.match(
    await page.getByRole("button", { name: /사용 지역/ }).innerText(),
    /미국/,
  );
  await page.getByRole("button", { name: /사용 지역/ }).click();
  await page.getByRole("button", { name: "기억한 국가 지우기" }).click();
  await page.locator(".modal-heading .icon-button").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("sv_country")),
    null,
  );
  await page.locator(".language-button").click();
  await page.locator(".settings-language-fields select").selectOption("es");
  await page.locator(".modal-heading .icon-button").click();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".language-button").click();
  assert.equal(
    await page.locator(".settings-language-fields select").inputValue(),
    "es",
  );
  await page.locator(".settings-language-fields select").selectOption("ko");
  await page.locator(".modal-heading .icon-button").click();
  results.push(
    "optional region memory and clear; display language persists on reload",
  );
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
  let checkRequests = 0;
  page.on("request", (request) => {
    if (/\/api\/(?:checks|demo)(?:[/?]|$)/.test(request.url())) checkRequests++;
  });
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const resultLanguage = page.locator(".settings-language-fields select");
  const translatedUi = new Set();
  await page.screenshot({
    path: screenshots + "/desktop-settings.png",
    fullPage: true,
  });
  const translatedHeadings = new Set();
  for (const code of [
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "pt",
    "ar",
    "ru",
  ]) {
    await resultLanguage.selectOption(code);
    assert.equal(
      await page.locator("html").getAttribute("lang"),
      code === "zh" ? "zh-CN" : code === "pt" ? "pt-BR" : code,
    );
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      code === "ar" ? "rtl" : "ltr",
    );
    translatedUi.add(await page.locator(".language-button").innerText());
    assert.equal(
      await page.locator(".result-container").getAttribute("lang"),
      code,
    );
    assert.equal(
      await page.locator(".result-container").getAttribute("dir"),
      code === "ar" ? "rtl" : "ltr",
    );
    assert.ok(
      await page.getByText("2026년 11월 10일", { exact: true }).isVisible(),
    );
    translatedHeadings.add(
      await page.locator(".result-heading h1").innerText(),
    );
  }
  assert.equal(translatedHeadings.size, 10);
  assert.equal(translatedUi.size, 10);
  await resultLanguage.selectOption("ar");
  await page.locator(".modal-heading .icon-button").click();
  await page.screenshot({
    path: screenshots + "/desktop-arabic-result.png",
    fullPage: true,
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator(".next-step-card button.secondary").click();
  assert.equal(await page.locator(".toast").getAttribute("lang"), "ar");
  assert.equal(await page.locator(".toast").getAttribute("dir"), "rtl");
  const arabicSummary = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  assert.match(arabicSummary, /[\u0600-\u06ff]/);
  assert.match(arabicSummary, /2026년 11월 10일/);
  await page.locator(".language-button").click();
  await resultLanguage.selectOption("en");
  assert.equal(
    await page.locator(".settings-language-fields select").inputValue(),
    "en",
  );
  await page.locator(".modal-heading .icon-button").click();
  assert.equal(
    checkRequests,
    0,
    "changing display language must not make an API request",
  );
  await page.getByRole("heading", { name: "We found a few changes" }).waitFor();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy summary" }).click();
  const summary = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(summary, /We found a few changes/);
  assert.match(summary, /2026년 11월 10일/);
  assert.ok(
    await page.getByText("2026년 11월 10일", { exact: true }).isVisible(),
  );
  results.push(
    "ten display languages, RTL, copy and preserved facts without new requests",
  );
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
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await page
    .getByRole("alert")
    .getByText("Choose a JPG, PNG or WebP photo.")
    .waitFor();
  results.push("unsupported upload shows a recoverable error");
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
  // A successful OCR response may omit a table: keep the image available for
  // human comparison and expose the existing correction flow without inference.
  const imageReview = await context.newPage();
  await imageReview.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await imageReview.route("**/api/extract", (route) =>
    route.fulfill({ json: { notice: fakeNotice } }),
  );
  await imageReview.goto(origin, { waitUntil: "networkidle" });
  await imageReview
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "synthetic-notice.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await imageReview
    .getByRole("button", { name: "Read this notice", exact: true })
    .click();
  await imageReview
    .getByRole("heading", { name: "Is this the right notice?" })
    .waitFor();
  assert.ok(await imageReview.locator(".image-review img").isVisible());
  assert.match(
    await imageReview.locator(".image-review .notice-warning").innerText(),
    /Tables or small print/,
  );
  assert.ok(
    await imageReview.locator(".review-card > .transcript p").isVisible(),
  );
  await imageReview
    .getByRole("button", { name: "Edit the text and read again" })
    .click();
  assert.equal(
    await imageReview.getByRole("textbox", { name: "Paste text" }).inputValue(),
    fakeNotice.originalText,
  );
  await imageReview.close();
  results.push(
    "photo review shows source image, omission warning and extracted text with correction flow",
  );
  const uploadErrors = await context.newPage();
  await uploadErrors.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await uploadErrors.route("**/api/extract", (route) =>
    route.fulfill({
      status: 413,
      contentType: "text/plain",
      body: "Request Entity Too Large",
    }),
  );
  await uploadErrors.goto(origin, { waitUntil: "networkidle" });
  await uploadErrors
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "synthetic-notice.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await uploadErrors
    .getByRole("button", { name: "Read this notice", exact: true })
    .click();
  await uploadErrors
    .getByRole("alert")
    .getByText("The upload is too large. Choose a smaller photo.")
    .waitFor();
  await uploadErrors.unroute("**/api/extract");
  await uploadErrors.route("**/api/extract", (route) =>
    route.fulfill({ status: 422, json: { error: "not_a_notice" } }),
  );
  await uploadErrors
    .getByRole("button", { name: "Read this notice", exact: true })
    .click();
  await uploadErrors
    .getByRole("alert")
    .getByText("No notice could be read. Try another photo or text.")
    .waitFor();
  // A provider failure keeps the chosen photo so the same image can be retried.
  await uploadErrors.unroute("**/api/extract");
  await uploadErrors.route("**/api/extract", (route) =>
    route.fulfill({ status: 503, json: { error: "model_unavailable" } }),
  );
  await uploadErrors
    .getByRole("button", { name: "Read this notice", exact: true })
    .click();
  await uploadErrors
    .getByRole("alert")
    .getByText("Please try again in a moment.", { exact: false })
    .waitFor();
  assert.equal(
    await uploadErrors
      .getByRole("button", { name: "Read this notice", exact: true })
      .isEnabled(),
    true,
  );
  await uploadErrors.close();
  results.push(
    "non-JSON 413, non-notice and provider errors keep the photo for retry",
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({ json: { notice: fakeNotice } }),
  );
  await page.reload({ waitUntil: "networkidle" });
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
  const readCountry = page.locator(".review-card select");
  assert.equal(await readCountry.inputValue(), "GB");
  assert.match(
    await page.getByRole("button", { name: /Region of use/ }).innerText(),
    /Not selected/,
  );
  await readCountry.selectOption("US");
  assert.equal(await readCountry.inputValue(), "US");
  await readCountry.selectOption("GB");
  assert.equal(await readCountry.inputValue(), "GB");
  assert.match(
    await page.getByRole("button", { name: /Region of use/ }).innerText(),
    /Not selected/,
  );
  await page.getByRole("button", { name: /Region of use/ }).click();
  await page
    .getByRole("textbox", { name: "Search countries" })
    .fill("United States");
  await page
    .getByRole("button", { name: /USUnited States|US United States/ })
    .click();
  await page
    .getByRole("textbox", { name: "Year or edition" })
    .fill("2026 corrected");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".settings-language-fields select").selectOption("es");
  assert.equal(await readCountry.inputValue(), "GB");
  await page.locator(".settings-language-fields select").selectOption("en");
  await page.locator(".modal-heading .icon-button").click();
  assert.equal(await readCountry.inputValue(), "GB");
  assert.match(
    await page.getByRole("button", { name: /Region of use/ }).innerText(),
    /United States/,
  );
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
  fixtureResult.result.candidates = [
    { title: "Synthetic source candidate", url: "https://example.org/notice" },
  ];
  // Per-candidate outcomes and stage timing as a live check returns them.
  const comparedSource = fixtureResult.result.sources[0];
  fixtureResult.result.warnings.push("source_too_large");
  fixtureResult.result.attempts = [
    {
      url: "https://large.example.org/notice",
      outcome: "fetch_failed",
      code: "source_too_large",
    },
    {
      url: comparedSource.url,
      outcome: "compared",
      sourceId: comparedSource.id,
      authority: "registered",
      identity: "ok",
      section: false,
      verified: 2,
      fields: 2,
    },
  ];
  fixtureResult.result.timing = {
    searchMs: 0,
    fetchMs: 310,
    compareMs: 24800,
    modelCalls: 1,
  };
  fixtureResult.result.elapsedMs = 25600;
  let sentNotice;
  await page.route(
    "**/api/checks",
    (route) => (
      (sentNotice = route.request().postDataJSON()),
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
      })
    ),
  );
  await page.locator(".language-button").click();
  await page.locator(".settings-language-fields select").selectOption("es");
  await page.locator(".modal-heading .icon-button").click();
  await page.locator(".review-card button.primary").click();
  await page.locator('.result-container[lang="es"]').waitFor();
  assert.equal(sentNotice.notice.edition, "2026 corrected");
  assert.equal(sentNotice.lang, "es");
  await page.locator(".language-button").click();
  await page.locator(".settings-language-fields select").selectOption("en");
  await page.locator(".modal-heading .icon-button").click();
  await page.getByRole("heading", { name: "We found a few changes" }).waitFor();
  assert.ok(
    await page
      .getByText(/A candidate is not necessarily a verified official source/)
      .isVisible(),
  );
  // One oversized candidate is reported for that source only.
  await page
    .getByRole("heading", { name: "What happened with each source" })
    .waitFor();
  assert.ok(await page.getByText("Could not be read").isVisible());
  assert.ok(await page.getByText("Same notice confirmed").isVisible());
  assert.ok(await page.getByText("Quotes confirmed: 2 of 2").isVisible());
  assert.equal(
    await page
      .locator(".result-warnings")
      .getByText(/too large/i)
      .count(),
    0,
  );
  await page.locator(".timing-details summary").click();
  assert.ok(
    await page
      .locator(".timing-details")
      .getByText("Comparison", { exact: true })
      .isVisible(),
  );
  await audit(page, "result with per-source outcomes and timing");
  await page.getByRole("button", { name: "Check using this link" }).click();
  await page.getByRole("heading", { name: "We found a few changes" }).waitFor();
  assert.equal(sentNotice.sourceUrl, "https://example.org/notice");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "H1",
  );
  results.push("HTTP-fixture NDJSON progress and result integration");
  let deletedChecks = 0;
  await page.route("**/api/checks/**", (route) => {
    if (route.request().method() === "DELETE") {
      deletedChecks++;
      return route.fulfill({ status: 503, json: { error: "network" } });
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Delete this result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete result", exact: true })
    .click();
  await page
    .getByRole("status")
    .getByText(/connection was interrupted/i)
    .waitFor();
  assert.ok(
    await page
      .getByRole("heading", { name: "We found a few changes" })
      .isVisible(),
  );
  results.push("failed result deletion is visible and retains the result");
  await page.unroute("**/api/checks");
  let releaseCheck;
  const pendingCheck = new Promise((resolve) => {
    releaseCheck = resolve;
  });
  await page.route("**/api/checks", async (route) => {
    await pendingCheck;
    await route.abort().catch(() => {});
  });
  await page.getByRole("button", { name: "Run a fresh check" }).click();
  await page
    .getByRole("heading", { name: "A closer look at your notice" })
    .waitFor();
  await page.getByRole("button", { name: "Stop checking" }).click();
  await page
    .getByRole("heading", { name: "Is this the right notice?" })
    .waitFor();
  releaseCheck();
  assert.equal(
    deletedChecks,
    1,
    "cancelling before a new check is created must not delete the previous result",
  );
  results.push(
    "cancelling a recheck before creation preserves the previous result",
  );
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(origin, { waitUntil: "networkidle" });
  await phone.getByRole("button", { name: /사용 지역/ }).click();
  assert.ok(
    (await phone
      .getByRole("textbox", { name: "국가 이름 검색" })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 16,
  );
  await phone.screenshot({
    path: screenshots + "/mobile-settings.png",
    fullPage: true,
  });
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const closeSize = await phone
    .locator(".modal-heading .icon-button")
    .boundingBox();
  assert.ok(closeSize && closeSize.width >= 44 && closeSize.height >= 44);
  await phone.locator(".modal-heading .icon-button").click();
  await phone.getByRole("tab", { name: "텍스트로" }).click();
  assert.ok(
    (await phone
      .getByRole("textbox", { name: "텍스트로" })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 16,
  );
  await phone.getByRole("tab", { name: "사진으로" }).click();
  await phone
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "synthetic-notice.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await phone.getByRole("img", { name: "선택한 안내문 미리보기" }).waitFor();
  const cropSize = await phone
    .getByRole("button", { name: "자르기", exact: true })
    .boundingBox();
  assert.ok(cropSize && cropSize.width >= 44 && cropSize.height >= 44);
  await phone.getByRole("button", { name: "사진 삭제", exact: true }).click();
  results.push("mobile input text and touch target sizes");
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
  await phone.locator(".language-button").click();
  await phone.locator(".settings-language-fields select").selectOption("ar");
  await phone.locator(".modal-heading .icon-button").click();
  assert.equal(
    await phone.locator(".result-container").getAttribute("dir"),
    "rtl",
  );
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await phone.screenshot({
    path: screenshots + "/mobile-arabic-result.png",
    fullPage: true,
  });
  await audit(phone, "mobile result");
  results.push("390px touch viewport and result without horizontal overflow");
  for (const width of [320, 390]) {
    await phone.setViewportSize({ width, height: 800 });
    await phone.locator(".language-button").click();
    assert.equal(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.equal(
      await phone
        .locator(".modal")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    assert.ok(await phone.locator(".country-search input").isVisible());
    await phone.locator(".modal").evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished),
      );
    });
    await audit(phone, `${width}px settings`);
    await phone.locator(".modal-heading .icon-button").click();
    for (const code of ["ar", "de", "fr"]) {
      await phone.locator(".language-button").click();
      await phone
        .locator(".settings-language-fields select")
        .selectOption(code);
      await phone.locator(".modal-heading .icon-button").click();
      assert.equal(
        await phone.locator(".result-container").getAttribute("lang"),
        code,
      );
      assert.equal(
        await phone.locator(".result-container").getAttribute("dir"),
        code === "ar" ? "rtl" : "ltr",
      );
      assert.equal(
        await phone.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${width}px ${code} result overflow`,
      );
      await audit(phone, `${width}px ${code} result`);
    }
  }
  results.push(
    "320px and 390px settings and Arabic, German and French results without overflow; RTL and axe checks",
  );
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
