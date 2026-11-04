// Browser check for the Google Maps search links on location cards.
// Every API response is a fixed fixture: no model, search or source request
// is made, and every request to google.com is recorded and aborted.
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
const languages = ["ko", "en", "zh", "es", "fr", "de", "ja", "pt", "ar", "ru"];
const uncertain = {
  ko: "확인 필요",
  en: "Needs review",
};
const results = [];
const violations = [];
const pageErrors = [];

const source = (id, url) => ({
  id,
  url,
  title: "Synthetic notice " + id,
  fetchedAt: "2026-11-04T00:00:00.000Z",
  authority: "registered",
});
const card = (before, after, extra = {}) => ({
  key: "location",
  before,
  after,
  beforeQuote: before ? "장소: " + before : null,
  afterQuote: after ? "장소 | " + after : null,
  sourceId: "source-0",
  relation: before && after && before !== after ? "changed" : "same",
  verified: true,
  ...extra,
});
function fixture(name, cards, extra = {}) {
  return {
    id: "fixture-" + name,
    mode: "live",
    status: "changed",
    title: "Synthetic map fixture",
    institution: "Example Library",
    country: null,
    checkedAt: "2026-11-04T00:00:00.000Z",
    expiresAt: "2026-11-05T00:00:00.000Z",
    comparisons: cards,
    sources: [
      source("source-0", "https://www.nypl.org/events/notice-a"),
      source("source-1", "https://www.sfpl.org/events/notice-b"),
    ],
    candidates: [],
    warnings: [],
    lang: "ko",
    elapsedMs: 1200,
    ...extra,
  };
}
const deadline = {
  key: "deadline",
  before: "2026년 11월 4일",
  after: "2026년 11월 10일",
  beforeQuote: "마감: 2026년 11월 4일",
  afterQuote: "마감 | 2026년 11월 10일",
  sourceId: "source-0",
  relation: "changed",
  verified: true,
};

// name, result, expected map queries per location card in display order
const cases = [
  [
    "changed",
    fixture("changed", [deadline, card("1층 커뮤니티실", "2층 다목적실")]),
    [["1층 커뮤니티실", "2층 다목적실"]],
  ],
  [
    "same",
    fixture("same", [card("수산제역사공원 일원", "  수산제역사공원 일원 ")], {
      status: "matched",
    }),
    [["수산제역사공원 일원"]],
  ],
  [
    "before-only",
    fixture(
      "before-only",
      [
        card("Main Library (2nd floor)", null, {
          verified: false,
          relation: "unclear",
        }),
      ],
      { status: "review", warnings: ["partial"] },
    ),
    [["Main Library (2nd floor)"]],
  ],
  [
    "after-only",
    fixture(
      "after-only",
      [card(null, "Hall A & B", { verified: false, relation: "unclear" })],
      { status: "review" },
    ),
    [["Hall A & B"]],
  ],
  [
    "both-null",
    fixture(
      "both-null",
      [card(null, null, { verified: false, relation: "unclear" })],
      { status: "review" },
    ),
    [[]],
  ],
  [
    "dash",
    fixture(
      "dash",
      [card("—", "—", { verified: false, relation: "unclear" })],
      { status: "review" },
    ),
    [[]],
  ],
  [
    "review-unverified",
    fixture(
      "review",
      [
        card("Room #4", "C++ Lab + Annex", {
          verified: false,
          relation: "unclear",
        }),
      ],
      { status: "review", warnings: ["identity", "evidence"] },
    ),
    [["Room #4", "C++ Lab + Annex"]],
  ],
  [
    "unavailable",
    fixture(
      "unavailable",
      [card("100% Hall", null, { verified: false, relation: "unclear" })],
      { status: "unavailable", warnings: ["evidence"] },
    ),
    [["100% Hall"]],
  ],
  [
    "two-sources",
    fixture(
      "two-sources",
      [
        card("مكتبة الإسكندرية", "Garden 🌱 Pavilion"),
        card("مكتبة الإسكندرية", "東京都 千代田区", { sourceId: "source-1" }),
      ],
      { status: "review", warnings: ["conflict"] },
    ),
    [
      ["مكتبة الإسكندرية", "Garden 🌱 Pavilion"],
      ["مكتبة الإسكندرية", "東京都 千代田区"],
    ],
  ],
  [
    "demo",
    fixture("demo", [card("1층 커뮤니티실", "2층 다목적실")], {
      mode: "demo",
      expiresAt: null,
    }),
    [[]],
  ],
];

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

async function openResult(context, result, { width = 390, lang = "ko" } = {}) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 844 });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const api = { checks: 0, extract: 0, demo: 0 };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/checks")) api.checks++;
    if (path === "/api/extract") api.extract++;
    if (path.startsWith("/api/demo")) api.demo++;
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { liveAvailable: true, demoAvailable: true } }),
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      json: {
        notice: {
          title: "Synthetic map fixture",
          institution: "Example Library",
          edition: null,
          country: null,
          originalText: "Synthetic map fixture\n장소: 1층 커뮤니티실",
          fields: [],
        },
      },
    }),
  );
  await page.route("**/api/checks", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body:
        [
          { type: "created", data: { id: result.id } },
          { type: "phase", data: { step: "compare" } },
          { type: "result", data: result },
        ]
          .map((x) => JSON.stringify(x))
          .join("\n") + "\n",
    }),
  );
  await page.addInitScript((l) => {
    try {
      localStorage.setItem("sv_display_lang", l);
    } catch {}
  }, lang);
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#text-tab").click();
  await page.locator("textarea").first().fill("Synthetic map fixture notice");
  await page.locator(".start-button").click();
  await page.locator(".review-card").waitFor();
  await page.locator(".review-card button.primary").click();
  await page.locator(".result-container").waitFor();
  return { page, api };
}

async function mapState(page) {
  return page.locator(".comparison-card").evaluateAll((cards) =>
    cards
      .filter(
        (c) =>
          c.querySelector(".map-search-link, .map-search-note") ||
          c.dataset.key === "location" ||
          true,
      )
      .map((c) => ({
        links: [...c.querySelectorAll("a.map-search-link")].map((a) => ({
          href: a.getAttribute("href"),
          target: a.getAttribute("target"),
          rel: a.getAttribute("rel"),
          name: a.textContent,
          place: a.querySelector("bdi")?.textContent,
        })),
        note: !!c.querySelector(".map-search-note"),
        badge: c.querySelector(".comparison-badge")?.textContent || "",
        heading: c.querySelector("h2")?.textContent || "",
        checkIconInLink: !!c.querySelector(
          "a.map-search-link svg.lucide-check, a.map-search-link svg.lucide-check-circle",
        ),
      })),
  );
}

const context = await browser.newContext({ locale: "ko-KR" });
const google = [];
await context.route("**://*.google.com/**", (route) => {
  google.push(route.request().url());
  return route.abort();
});

for (const [name, result, expected] of cases) {
  const { page, api } = await openResult(context, result);
  const state = await mapState(page);
  const location = state.filter(
    (_c, i) => result.comparisons[i].key === "location",
  );
  const other = state.filter(
    (_c, i) => result.comparisons[i].key !== "location",
  );
  assert.equal(location.length, expected.length, name);
  for (const [i, queries] of expected.entries()) {
    const got = location[i].links.map((l) =>
      new URL(l.href).searchParams.get("query"),
    );
    assert.deepEqual(got, queries, `${name} card ${i}`);
    for (const l of location[i].links) {
      const url = new URL(l.href);
      assert.equal(
        url.origin + url.pathname,
        "https://www.google.com/maps/search/",
      );
      assert.equal(url.searchParams.get("api"), "1");
      assert.ok(url.searchParams.get("query").trim(), `${name}: empty query`);
      assert.equal(l.target, "_blank");
      assert.equal(l.rel, "noopener noreferrer");
      assert.equal(l.place, url.searchParams.get("query"));
    }
    assert.equal(location[i].note, queries.length > 0, `${name} note`);
    assert.equal(location[i].checkIconInLink, false, `${name} check icon`);
    // Unverified cards keep their "needs review" badge.
    if (
      result.comparisons.filter((c) => c.key === "location")[i].verified ===
      false
    )
      assert.equal(location[i].badge.trim(), uncertain.ko, `${name} badge`);
  }
  for (const c of other) assert.equal(c.links.length, 0, `${name} other card`);
  // Distinct sides are named differently for screen readers.
  if (name === "changed" || name === "review-unverified") {
    const names = location[0].links.map((l) => l.name);
    assert.match(names[0], /가지고 있던 안내/);
    assert.match(names[1], /조회한 자료/);
    assert.ok(names.every((n) => /새 창/.test(n)));
  }
  if (result.warnings.length)
    assert.ok(
      await page.locator(".result-warnings").isVisible(),
      `${name} warnings`,
    );
  if (result.mode === "demo")
    assert.ok(await page.locator(".demo-banner").isVisible());
  await audit(page, "maps " + name);
  await page.screenshot({
    path: `${screenshots}/maps-${name}.png`,
    fullPage: true,
  });
  // After the audit (the copy toast animates in): the copied summary never
  // carries a map URL.
  await page.evaluate(() => {
    window.__copied = "";
    navigator.clipboard.writeText = async (t) => {
      window.__copied = t;
    };
  });
  await page.locator(".next-step-card button.secondary").click();
  assert.ok(
    !(await page.evaluate(() => window.__copied)).includes("google.com"),
  );
  assert.equal(google.length, 0, `${name}: google request before any click`);
  assert.deepEqual(api, { checks: 1, extract: 1, demo: 0 }, name);
  results.push(
    `fixture ${name}: ${expected.map((q) => q.length).join("+")} link(s)`,
  );
  await page.close();
}

// Clicking opens the expected search in a new page; nothing else is requested.
{
  const [, result, expected] = cases[0];
  const { page, api } = await openResult(context, result);
  const link = page.locator("a.map-search-link").nth(1);
  const href = await link.getAttribute("href");
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    link.click(),
  ]);
  await popup.waitForLoadState().catch(() => {});
  await page.waitForTimeout(300);
  assert.ok(google.includes(href), "popup requested the expected URL");
  assert.equal(
    new URL(google.at(-1)).searchParams.get("query"),
    expected[0][1],
  );
  await popup.close();
  // Keyboard: Tab reaches the first map link, Enter opens it.
  await page.locator(".back-button").focus();
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(
      () =>
        document.activeElement?.classList.contains("map-search-link") || false,
    );
  }
  assert.ok(reached, "keyboard reaches a map link");
  const focusedHref = await page.evaluate(() =>
    document.activeElement.getAttribute("href"),
  );
  const before = google.length;
  const [keyPopup] = await Promise.all([
    context.waitForEvent("page"),
    page.keyboard.press("Enter"),
  ]);
  await keyPopup.waitForLoadState().catch(() => {});
  await page.waitForTimeout(300);
  assert.equal(google.length, before + 1);
  assert.equal(google.at(-1), focusedHref);
  await keyPopup.close();
  // Place text and hrefs are identical in all ten display languages, and
  // language changes make no further requests.
  const baseline = await mapState(page);
  for (const code of languages) {
    await page.locator(".language-button").click();
    await page.locator(".settings-language-fields select").selectOption(code);
    await page.locator(".modal-heading .icon-button").click();
    const now = await mapState(page);
    assert.deepEqual(
      now.map((c) => c.links.map((l) => [l.href, l.place])),
      baseline.map((c) => c.links.map((l) => [l.href, l.place])),
      code,
    );
  }
  assert.deepEqual(
    api,
    { checks: 1, extract: 1, demo: 0 },
    "after clicks and language changes",
  );
  results.push(
    "click and Enter open the expected search; 10 languages keep href and place text",
  );
  await page.close();
}

// Narrow screens in Korean, Arabic (RTL) and German: no horizontal overflow,
// touch targets of at least 44px.
for (const lang of ["ko", "ar", "de"]) {
  for (const width of [320, 360, 390]) {
    const { page } = await openResult(context, cases[8][1], { width, lang });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(overflow <= 0, `${lang} ${width}px overflow ${overflow}`);
    for (const box of await page
      .locator("a.map-search-link")
      .evaluateAll((links) =>
        links.map((a) => a.getBoundingClientRect().toJSON()),
      ))
      assert.ok(box.height >= 44, `${lang} ${width}px target ${box.height}`);
    if (width === 320) {
      await audit(page, `maps ${lang} ${width}`);
      await page.screenshot({
        path: `${screenshots}/maps-${lang}-${width}.png`,
        fullPage: true,
      });
    }
    await page.close();
  }
}
results.push("320/360/390px in ko, ar and de without overflow; 44px targets");

assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
assert.equal(violations.length, 0, JSON.stringify(violations));
await browser.close();
console.log(
  JSON.stringify(
    {
      checks: results,
      googleRequestsAfterClicks: google.length,
      violations,
      pageErrors,
      screenshots,
    },
    null,
    2,
  ),
);
