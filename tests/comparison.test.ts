import test from "node:test";
import assert from "node:assert/strict";
import { assembleResult, validExplicitTimestamp } from "../src/lib/compare";
import { demoResult } from "../src/lib/demo";
import type { ModelComparison, Notice, Source } from "../src/lib/schema";
import { resultLanguages } from "../src/lib/languages";

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
test("a missing comparison leaves the overall result in review", () => {
  const n: Notice = {
    ...notice,
    fields: [
      ...notice.fields,
      { key: "status", value: "Open", quote: "Status: Open." },
    ],
  };
  const result = run(n);
  assert.equal(result.comparisons[0].verified, true);
  assert.equal(result.status, "review");
  assert.ok(result.warnings.includes("partial"));
});
test("failed searches and source retrieval do not yield a confirmed result", () => {
  for (const warning of ["search", "budget", "network", "fetch"]) {
    const result = assembleResult({
      id: "test",
      notice,
      sources: [source],
      analyses: [analysis],
      lang: "en",
      warnings: [warning],
    });
    assert.equal(result.status, "review", warning);
    assert.equal(result.comparisons[0].verified, true);
  }
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
test("result languages do not modify verified facts or expose model prose", () => {
  const a = {
    ...analysis,
    summary: "invented new deadline",
    next_action: "call 555-0000",
  };
  const baseline = assembleResult({
    id: "test",
    notice,
    sources: [source],
    analyses: [a],
    lang: "en",
    checkedAt: "2026-11-03T00:00:00Z",
  });
  for (const lang of resultLanguages) {
    const result = assembleResult({
      id: "test",
      notice,
      sources: [source],
      analyses: [a],
      lang,
      checkedAt: "2026-11-03T00:00:00Z",
    });
    assert.deepEqual({ ...result, lang: "en" }, baseline);
    assert.equal(JSON.stringify(result).includes(a.summary), false);
    assert.equal(JSON.stringify(result).includes(a.next_action), false);
  }
});
test("case, Unicode width and whitespace changes cannot become verified excerpts", () => {
  const original = "Status: Open ２０２６";
  const updated = "Status: Closed ２０２６";
  const n: Notice = {
    ...notice,
    originalText: `2026 Garden workshop. ${original}`,
    fields: [{ key: "status", value: "Open ２０２６", quote: original }],
  };
  const s: Source = {
    ...source,
    text: `2026 Garden workshop. Example Library. ${updated}`,
  };
  const a: ModelComparison = {
    ...analysis,
    comparisons: [
      {
        key: "status",
        before: "Open ２０２６",
        after: "Closed ２０２６",
        before_quote: original,
        after_quote: updated,
        relation: "changed",
      },
    ],
  };
  assert.equal(run(n, s, a).status, "changed");
  for (const [key, variants] of [
    ["before", ["open ２０２６", "Open 2026", "Open  ２０２６"]],
    ["after", ["closed ２０２６", "Closed 2026", "Closed  ２０２６"]],
    [
      "before_quote",
      ["Status: open ２０２６", "Status: Open 2026", "Status: Open  ２０２６"],
    ],
    [
      "after_quote",
      [
        "Status: closed ２０２６",
        "Status: Closed 2026",
        "Status: Closed  ２０２６",
      ],
    ],
  ] as const) {
    for (const variant of variants) {
      const altered = structuredClone(a);
      altered.comparisons[0][key] = variant;
      const result = run(n, s, altered);
      assert.equal(result.status, "review", `${key}: ${variant}`);
      assert.equal(result.comparisons[0].verified, false);
      assert.equal(result.comparisons[0].relation, "unclear");
      assert.equal(
        JSON.stringify(result.comparisons[0]).includes(variant),
        false,
      );
    }
  }
  const alteredIdentity = {
    ...a,
    identity_quote: "2026 garden workshop. Example Library.",
  };
  assert.equal(run(n, s, alteredIdentity).status, "review");
});

test("a cancellation document cannot silently match an unchanged deadline", () => {
  const s = {
    ...source,
    text: `${analysis.identity_quote} The event is cancelled. Apply by 4 November 2026.`,
  };
  const a: ModelComparison = {
    ...analysis,
    source_role: "cancellation",
    comparisons: [
      {
        ...analysis.comparisons[0],
        after: "4 November 2026",
        after_quote: "Apply by 4 November 2026.",
        relation: "same",
      },
    ],
  };
  const result = run(notice, s, a);
  assert.equal(result.status, "review");
  assert.ok(result.warnings.includes("evidence"));
});

function cancellationCase(
  statement: string,
  after = "cancelled",
  quote = statement,
) {
  const s = {
    ...source,
    text: `${analysis.identity_quote} Apply by 10 November 2026. ${statement}`,
  };
  const a: ModelComparison = {
    ...analysis,
    source_role: "cancellation",
    comparisons: [
      ...analysis.comparisons,
      {
        key: "status",
        before: null,
        before_quote: null,
        after,
        after_quote: quote,
        relation: "changed",
      },
    ],
  };
  return run(notice, s, a);
}

test("new explicit cancellation is verified without an original status field", () => {
  const result = cancellationCase("The event is cancelled.");
  assert.equal(result.status, "cancelled");
  assert.deepEqual(result.comparisons[1], {
    key: "status",
    before: null,
    beforeQuote: null,
    after: "cancelled",
    afterQuote: "The event is cancelled.",
    sourceId: source.id,
    relation: "changed",
    verified: true,
  });
});

test("truncated cancellation quotations cannot remove conditional or historical context", () => {
  for (const statement of [
    "If severe weather occurs, the event will be cancelled.",
    "The event is not cancelled.",
    "The event was cancelled last year.",
    "The organiser said ‘The event is cancelled.’",
    "The picnic is cancelled.",
    "If severe weather occurs. The event is cancelled.",
    "The event is cancelled. This decision was reversed.",
  ]) {
    const result = cancellationCase(statement, "cancelled", "cancelled");
    assert.equal(result.status, "review", statement);
    assert.equal(result.comparisons[1].verified, false, statement);
  }
});

test("uncertain cancellation is blocked even with an original status", () => {
  const n: Notice = {
    ...notice,
    fields: [{ key: "status", value: "Open", quote: "Status: Open." }],
  };
  const statement = "If severe weather occurs, the event will be cancelled.";
  const s = { ...source, text: `${analysis.identity_quote} ${statement}` };
  const a: ModelComparison = {
    ...analysis,
    source_role: "cancellation",
    comparisons: [
      {
        key: "status",
        before: "Open",
        before_quote: "Status: Open.",
        after: "cancelled",
        after_quote: "cancelled",
        relation: "changed",
      },
    ],
  };
  assert.equal(run(n, s, a).comparisons[0].verified, false);
  assert.equal(run(n, s, a).status, "review");
});

test("same-year edition, institution and event contradictions override model identity", () => {
  for (const edition of [
    "session 1",
    "round 1",
    "1st edition",
    "cohort 1",
    "제1회",
    "1차",
    "1기",
  ]) {
    const title = `2026 Garden workshop ${edition}`;
    const n = { ...notice, title, edition: `2026 ${edition}` };
    const identity = `2026 ${edition}. ${title}. Example Library.`;
    const s = { ...source, text: `${identity} Apply by 10 November 2026.` };
    const a = { ...analysis, identity_quote: identity };
    assert.equal(run(n, s, a).status, "changed", edition);
    const wrong = identity.replaceAll("1", "2");
    assert.equal(
      run(
        n,
        { ...s, text: s.text.replace(identity, wrong) },
        { ...a, identity_quote: wrong },
      ).status,
      "review",
      edition,
    );
    assert.equal(
      run(n, { ...s, title: title.replaceAll("1", "2") }, a).status,
      "review",
      edition,
    );
  }
  for (const identity of [
    "2026 Garden workshop. Another Library.",
    "2026 Music workshop. Example Library.",
  ]) {
    assert.equal(
      run(
        notice,
        { ...source, text: `${identity} Apply by 10 November 2026.` },
        { ...analysis, identity_quote: identity },
      ).status,
      "review",
    );
  }
});

test("numeric date ambiguity is detected in timestamps and sentences, preserving clear dates", () => {
  for (const [before, after, expected] of [
    ["03/04/2026 17:00", "04/03/2026 17:00", "review"],
    ["by 03.04.2026 at 17:00", "by 04.03.2026 at 17:00", "review"],
    ["03-04-2026 17:00", "04-03-2026 17:00", "review"],
    ["03/04/2026 17:00", "03/04/2026 17:00", "review"],
    ["2026-11-04 17:00", "2026-11-05 17:00", "changed"],
    ["13/11/2026 17:00", "14/11/2026 17:00", "changed"],
    ["11/11/2026 17:00", "11/11/2026 17:00", "matched"],
    ["4 November 2026", "4 November 2026", "matched"],
  ] as const) {
    const n: Notice = {
      ...notice,
      originalText: `Deadline: ${before}`,
      fields: [
        { key: "deadline", value: before, quote: `Deadline: ${before}` },
      ],
    };
    const s = {
      ...source,
      text: `${analysis.identity_quote} Deadline: ${after}`,
    };
    const a: ModelComparison = {
      ...analysis,
      comparisons: [
        {
          key: "deadline",
          before,
          after,
          before_quote: `Deadline: ${before}`,
          after_quote: `Deadline: ${after}`,
          relation: before === after ? "same" : "changed",
        },
      ],
    };
    const result = run(n, s, a);
    assert.equal(result.status, expected, `${before} → ${after}`);
    assert.equal(result.comparisons[0].after, after);
  }
});

test("Korean exact identity and explicit cancellation remain supported", () => {
  assert.equal(demoResult("cancelled", "ko").status, "cancelled");
  assert.equal(demoResult("deadline", "ko").status, "changed");
});

test("a conflicting event heading cannot be overridden by a matching paragraph", () => {
  assert.equal(
    run(notice, { ...source, title: "2026 Music workshop" }).status,
    "review",
  );
  assert.equal(
    run(notice, { ...source, title: "2026 Garden workshop — update" }).status,
    "changed",
  );
});

test("exact non-English event and edition identities can confirm clear changes", () => {
  for (const [title, institution, edition] of [
    ["Atelier du jardin 2026", "Bibliothèque municipale", "2026"],
    ["2026 園芸講座 第2回", "市立図書館", "第2回"],
    ["2026 가을 정원 교실 제2회", "시립도서관", "제2회"],
  ]) {
    const identity = `${title}. ${institution}.`;
    const n = { ...notice, title, institution, edition };
    const s = {
      ...source,
      title,
      text: `${identity} Apply by 10 November 2026.`,
    };
    assert.equal(
      run(n, s, { ...analysis, identity_quote: identity }).status,
      "changed",
      title,
    );
  }
});

test("unrelated months, refund policies and quoted titles do not veto explicit cancellation", () => {
  for (const extra of [
    "Scheduled for May 5.",
    "Tickets are not refundable.",
    "Read “Garden news” for updates.",
    "Registration may require identification.",
  ]) {
    assert.equal(
      cancellationCase(
        `The event is cancelled. ${extra}`,
        "cancelled",
        "The event is cancelled.",
      ).status,
      "cancelled",
      extra,
    );
  }
});

test("adjacent conditions and reversals still qualify an otherwise explicit cancellation", () => {
  for (const statement of [
    "If severe weather occurs. The event is cancelled.",
    "The event is cancelled. This decision was reversed.",
    "The event is cancelled. The cancellation was withdrawn.",
    "Archive. The event is cancelled.",
  ]) {
    assert.equal(
      cancellationCase(statement, "cancelled", "The event is cancelled.")
        .status,
      "review",
      statement,
    );
  }
});

test("generic multilingual site headings do not contradict an exact notice identity", () => {
  for (const title of [
    "Events | Example Library",
    "News / Example Library",
    "Accueil | Example Library",
    "Événements | Example Library",
    "행사안내 | Example Library",
    "お知らせ | Example Library",
    "公告 | Example Library",
  ]) {
    assert.equal(run(notice, { ...source, title }).status, "changed", title);
  }
  for (const title of [
    "2026 Different Festival",
    "2027 Events | Example Library",
    "2026 Music workshop",
  ]) {
    assert.equal(run(notice, { ...source, title }).status, "review", title);
  }
});
