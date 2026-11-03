import test from "node:test";
import assert from "node:assert/strict";
import { assembleResult, validExplicitTimestamp } from "../src/lib/compare";
import { demoResult } from "../src/lib/demo";
import type { ModelComparison, Notice, Source } from "../src/lib/schema";

const notice: Notice = {
  title: "2026 Garden workshop",
  institution: "Example Library",
  edition: "2026",
  country: "US",
  originalText:
    "2026 Garden workshop. Example Library. Apply by 4 November 2026. Status: Open.",
  fields: [
    {
      key: "deadline",
      value: "4 November 2026",
      quote: "Apply by 4 November 2026.",
    },
  ],
};
const source: Source = {
  id: "source-0",
  url: "https://nypl.org/notice",
  title: "Workshop update",
  text: "2026 Garden workshop. Example Library. Apply by 10 November 2026.",
  authority: "registered",
  fetchedAt: "2026-11-03T00:00:00Z",
};
const analysis: ModelComparison = {
  same_notice: true,
  identity_quote: "2026 Garden workshop. Example Library.",
  country: "US",
  source_role: "amendment",
  comparisons: [
    {
      key: "deadline",
      before: "4 November 2026",
      after: "10 November 2026",
      before_quote: "Apply by 4 November 2026.",
      after_quote: "Apply by 10 November 2026.",
      relation: "changed",
    },
  ],
  summary: "",
  next_action: "",
};
test("a model claiming same edition cannot override a contradictory explicit year", () => {
  const nextSource = {
    ...source,
    text: source.text.replaceAll("2026", "2027"),
  };
  const nextAnalysis = structuredClone(analysis);
  nextAnalysis.identity_quote = nextAnalysis.identity_quote.replaceAll(
    "2026",
    "2027",
  );
  nextAnalysis.comparisons[0].after = "10 November 2027";
  nextAnalysis.comparisons[0].after_quote = "Apply by 10 November 2027.";
  assert.equal(run(notice, nextSource, nextAnalysis).status, "review");
});
test("ambiguous numeric dates remain review even if the model claims a change", () => {
  const n = {
    ...notice,
    originalText: "2026 Garden workshop. Deadline: 03/04",
    fields: [
      { key: "deadline" as const, value: "03/04", quote: "Deadline: 03/04" },
    ],
  };
  const s = {
    ...source,
    text: "2026 Garden workshop. Example Library. Deadline: 04/03",
  };
  const a = {
    ...analysis,
    comparisons: [
      {
        key: "deadline" as const,
        before: "03/04",
        after: "04/03",
        before_quote: "Deadline: 03/04",
        after_quote: "Deadline: 04/03",
        relation: "changed" as const,
      },
    ],
  };
  assert.equal(run(n, s, a).status, "review");
});
function run(
  n: Notice = notice,
  s: Source = source,
  a: ModelComparison = analysis,
) {
  return assembleResult({
    id: "test",
    notice: n,
    sources: [s],
    analyses: [a],
    lang: "en",
    checkedAt: "2026-11-03T00:00:00Z",
  });
}
test("a changed deadline requires quotes in both actual documents", () => {
  assert.equal(run().status, "changed");
  assert.equal(run().comparisons[0].verified, true);
});
test("a fabricated supporting quote cannot confirm a change", () => {
  const a = structuredClone(analysis);
  a.comparisons[0].after_quote = "Apply by 20 November 2026.";
  const r = run(notice, source, a);
  assert.equal(r.status, "review");
  assert.equal(r.comparisons[0].verified, false);
});
test("a different edition cannot be merged into the original notice", () => {
  const a = structuredClone(analysis);
  a.same_notice = false;
  assert.equal(run(notice, source, a).status, "review");
});
test("a country mismatch blocks confirmation", () => {
  assert.equal(
    run(notice, source, { ...analysis, country: "GB" }).status,
    "review",
  );
});
test("an unknown domain does not become official just because the model says so", () => {
  assert.equal(
    run(notice, { ...source, authority: "unverified" }).status,
    "review",
  );
});
test("the compared original value must actually be an extracted field", () => {
  const a = structuredClone(analysis);
  a.comparisons[0].before = "3 November 2026";
  assert.equal(run(notice, source, a).status, "review");
});
test("ambiguous interpretation remains review even with exact quotes", () => {
  const a = structuredClone(analysis);
  a.comparisons[0].relation = "unclear";
  assert.equal(run(notice, source, a).status, "review");
});
test("disagreeing sources cannot produce a confirmed deadline", () => {
  const s2 = {
    ...source,
    id: "source-1",
    text: source.text.replace("10 November", "12 November"),
  };
  const a2 = structuredClone(analysis);
  a2.comparisons[0].after = "12 November 2026";
  a2.comparisons[0].after_quote = "Apply by 12 November 2026.";
  const r = assembleResult({
    id: "test",
    notice,
    sources: [source, s2],
    analyses: [analysis, a2],
    lang: "en",
  });
  assert.equal(r.status, "review");
  assert.ok(r.warnings.includes("conflict"));
});
test("not finding a source means unavailable, not cancelled or matching", () => {
  assert.equal(
    assembleResult({
      id: "test",
      notice,
      sources: [],
      analyses: [],
      lang: "en",
    }).status,
    "unavailable",
  );
});
test("negative cancellation text cannot confirm a cancellation", () => {
  const n = {
    ...notice,
    fields: [{ key: "status" as const, value: "Open", quote: "Status: Open." }],
  };
  const s = {
    ...source,
    text: "2026 Garden workshop. Example Library. Status: Not Cancelled.",
  };
  const a = {
    ...analysis,
    source_role: "cancellation" as const,
    comparisons: [
      {
        key: "status" as const,
        before: "Open",
        after: "Cancelled",
        before_quote: "Status: Open.",
        after_quote: "Status: Not Cancelled.",
        relation: "changed" as const,
      },
    ],
  };
  assert.equal(run(n, s, a).status, "review");
});
test("cancellation demo is explicit and visibly synthetic", () => {
  const r = demoResult("cancelled", "en");
  assert.equal(r.status, "cancelled");
  assert.equal(r.mode, "demo");
});
test("format differences labelled as same are not silently treated as changes", () => {
  const a = structuredClone(analysis);
  a.comparisons[0].relation = "same";
  assert.equal(run(notice, source, a).status, "review");
});
test("dates without a time zone and impossible dates are not deadlines we can expire", () => {
  assert.equal(validExplicitTimestamp("2026-11-04"), false);
  assert.equal(validExplicitTimestamp("03/04"), false);
  assert.equal(validExplicitTimestamp("2026-02-30T12:00:00Z"), false);
  assert.equal(validExplicitTimestamp("2026-11-04T12:00:00+09:00"), true);
});
test("exactly matching explicit deadlines can be marked expired only with a time zone", () => {
  const timestamp = "2026-11-01T09:00:00+09:00";
  const n = {
    ...notice,
    originalText: `2026 Garden workshop. Deadline: ${timestamp}`,
    fields: [
      {
        key: "deadline" as const,
        value: timestamp,
        quote: `Deadline: ${timestamp}`,
      },
    ],
  };
  const s = {
    ...source,
    text: `2026 Garden workshop. Example Library. Deadline: ${timestamp}`,
  };
  const a = {
    ...analysis,
    comparisons: [
      {
        key: "deadline" as const,
        before: timestamp,
        after: timestamp,
        before_quote: `Deadline: ${timestamp}`,
        after_quote: `Deadline: ${timestamp}`,
        relation: "same" as const,
      },
    ],
  };
  assert.equal(run(n, s, a).status, "expired");
});
test("all three example scenarios exercise the production comparison guard", () => {
  assert.equal(demoResult("deadline", "ko").status, "changed");
  assert.equal(demoResult("identity", "ko").status, "review");
});
