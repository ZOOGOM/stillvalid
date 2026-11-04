import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pdfText, sourceMediaType } from "../src/lib/source";
import { assembleResult } from "../src/lib/compare";
import type { ModelComparison, Notice } from "../src/lib/schema";

// Synthetic fixtures generated for these tests; no real notice content.
const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const url = new URL("https://www.gov.uk/government/publications/notice.pdf");

test("a PDF's own text layer is extracted without changing its wording", async () => {
  const parsed = await pdfText(fixture("synthetic-notice.pdf"), url);
  assert.equal(parsed.title, "Synthetic PDF notice");
  assert.ok(parsed.text.includes("Applications Due: 18 December 2026."));
  assert.ok(parsed.text.includes("행사명 제4회 정원 워크숍"));
  assert.ok(parsed.text.includes("장소 예시도서관 강당"));
});

test("scanned, disguised, damaged and oversized PDFs are rejected with a reason", async () => {
  await assert.rejects(pdfText(fixture("image-only.pdf"), url), {
    code: "source_pdf_no_text",
  });
  await assert.rejects(
    pdfText(new TextEncoder().encode("<html>not a pdf</html>"), url),
    { code: "source_format" },
  );
  const notice = fixture("synthetic-notice.pdf");
  await assert.rejects(pdfText(notice.subarray(0, 600), url), {
    code: "source_format",
  });
  await assert.rejects(pdfText(fixture("twenty-one-pages.pdf"), url), {
    code: "source_too_large",
  });
  // The HTML/plain-text media type check is unchanged; PDF has its own path.
  assert.throws(() => sourceMediaType("application/pdf"), {
    code: "source_format",
  });
});

test("PDF-derived evidence passes the same exact-quote and identity checks", async () => {
  const parsed = await pdfText(fixture("synthetic-notice.pdf"), url);
  const notice: Notice = {
    title: "2026 Garden Workshop",
    institution: "Example Library",
    edition: "2026",
    country: "GB",
    originalText:
      "2026 Garden Workshop\nExample Library\nApplications Due: 11 December 2026.",
    fields: [
      {
        key: "deadline",
        value: "11 December 2026",
        quote: "Applications Due: 11 December 2026.",
      },
    ],
  };
  const model = (afterQuote: string): ModelComparison => ({
    same_notice: true,
    identity_quote:
      "2026 Garden Workshop\nExample Library. Synthetic example for tests.",
    country: "GB",
    source_role: "original",
    comparisons: [
      {
        key: "deadline",
        before: "11 December 2026",
        after: "18 December 2026",
        before_quote: "Applications Due: 11 December 2026.",
        after_quote: afterQuote,
        relation: "changed",
      },
    ],
    summary: "",
    next_action: "",
  });
  const run = (afterQuote: string) =>
    assembleResult({
      id: "test",
      notice,
      sources: [
        {
          id: "source-0",
          url: url.href,
          title: parsed.title,
          text: parsed.text,
          authority: "registered",
          fetchedAt: "2026-11-04T00:00:00Z",
          format: "pdf",
        },
      ],
      analyses: [model(afterQuote)],
      lang: "en",
      checkedAt: "2026-11-04T00:00:00Z",
    });
  const verified = run("Applications Due: 18 December 2026.");
  assert.equal(verified.status, "changed");
  assert.equal(verified.comparisons[0].verified, true);
  // The metadata title "Synthetic PDF notice" is display-only for PDFs; the
  // same text served as an HTML page with that specific heading still fails.
  assert.equal(
    assembleResult({
      id: "test",
      notice,
      sources: [
        {
          id: "source-0",
          url: url.href,
          title: parsed.title,
          text: parsed.text,
          authority: "registered",
          fetchedAt: "2026-11-04T00:00:00Z",
        },
      ],
      analyses: [model("Applications Due: 18 December 2026.")],
      lang: "en",
    }).status,
    "review",
  );
  // A quote the PDF does not contain is never verified.
  const fabricated = run("Applications Due: 18 December 2026, extended.");
  assert.equal(fabricated.status, "review");
  assert.equal(fabricated.comparisons[0].verified, false);
});
