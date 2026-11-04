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
  for (const warning of [
    "search",
    "budget",
    "network",
    "fetch",
    "source_format",
    "source_encoding",
    "source_too_large",
    "source_timeout",
    "source_blocked",
    "source_not_found",
    "source_not_notice",
  ]) {
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

test("identity matching never drops distinctive words or uses title token substrings", () => {
  for (const [title, institution, heading, identity] of [
    [
      "Fellowships",
      "Example Library",
      "Fellowships | Example Library Foundation",
      "Fellowships. Example Library.",
    ],
    [
      "Events",
      "Example Library",
      "Events | Example Library",
      "Events. Example Library.",
    ],
    [
      "Research Fellowships",
      "Example Library",
      "Fellowships | Example Library",
      "Fellowships. Example Library.",
    ],
    [
      "Example Library Fellowships",
      "Example Library",
      "Fellowships | Example Library",
      "Fellowships. Example Library.",
    ],
    [
      "Art",
      "Example Library",
      "Cartography | Example Library",
      "Cartography. Example Library.",
    ],
    [
      "2026 Garden workshop",
      "Library",
      "2026 Garden workshop | Another Library",
      "2026 Garden workshop. Another Library.",
    ],
    [
      "2026 Garden workshop",
      "Example Library",
      "2026 Music workshop | Example Library",
      "2026 Garden workshop. Example Library.",
    ],
    [
      "2026 Garden workshop",
      "Example Library",
      "2027 Garden workshop | Example Library",
      "2026 Garden workshop. Example Library.",
    ],
    [
      "2026 Garden workshop 2nd session",
      "Example Library",
      "2026 Garden workshop 3rd session | Example Library",
      "2026 Garden workshop 2nd session. Example Library.",
    ],
    [
      "2026 정원 교실",
      "시립도서관",
      "2026 Music workshop | Example Library",
      "2026 Music workshop. Example Library.",
    ],
  ]) {
    const n = { ...notice, title, institution, edition: null };
    const s = {
      ...source,
      title: heading,
      text: `${identity} Apply by 10 November 2026.`,
    };
    const result = run(n, s, { ...analysis, identity_quote: identity });
    assert.equal(result.status, "review", `${title} / ${heading}`);
    assert.equal(result.comparisons[0].verified, false);
  }
});

test("institution affixes cannot be removed to manufacture title agreement", () => {
  for (const title of [
    "Example Library 2026 Garden workshop",
    "2026 Garden workshop | Example Library",
  ]) {
    const n = { ...notice, title };
    const s = { ...source, title: "2026 Garden workshop | Example Library" };
    assert.equal(run(n, s).status, "review", title);
  }
});

test("a title-only quote borrows institution evidence only from a registered dedicated heading", () => {
  for (const [title, institution] of [
    ["2026 Garden workshop", "Example Library"],
    ["2026 정원 교실", "시립도서관"],
    ["2026 園芸講座", "市立図書館"],
  ]) {
    const n = { ...notice, title, institution };
    const s = {
      ...source,
      title: `${title} | ${institution}`,
      text: `${title}. Apply by 10 November 2026.`,
    };
    const a = { ...analysis, identity_quote: `${title}.` };
    // A registered page titled exactly "<title> | <institution>" may supply
    // the issuer; the same heading on an unregistered site may not.
    assert.equal(run(n, s, a).status, "changed", title);
    assert.equal(
      run(n, { ...s, authority: "unverified" as const }, a).status,
      "review",
      title,
    );
    for (const heading of [
      `${title} | Another Library`,
      `${title} | ${institution} Foundation`,
      `News | ${institution}`,
    ])
      assert.equal(
        run(n, { ...s, title: heading }, a).status,
        "review",
        heading,
      );
    assert.equal(run(n, s, { ...a, same_notice: false }).status, "review");
    assert.equal(run(n, s, { ...a, country: "GB" }).status, "review");
    assert.equal(
      run(n, s, { ...a, identity_quote: `${title}!` }).status,
      "review",
    );
  }
});

for (const context of [
  "Issued by Another Library.",
  "This page is for the 2027 edition only.",
  "This is an archive link. Current event: 2026 Music workshop.",
]) {
  test(`title-only quote rejects conflicting context: ${context}`, () => {
    const s = {
      ...source,
      title: "2026 Garden workshop | Example Library",
      text: `2026 Garden workshop. ${context} Apply by 10 November 2026.`,
    };
    const result = run(notice, s, {
      ...analysis,
      identity_quote: "2026 Garden workshop.",
    });
    assert.equal(result.status, "review", context);
    assert.equal(result.comparisons[0].verified, false, context);
  });
}

for (const [title, sourceTitle] of [
  ["Example Library History", "Local History"],
  ["History | Example Library", "Local History"],
  ["Example Library Art", "Modern Art"],
  ["Example Library Science", "Applied Science"],
]) {
  test(`a printed institution-bearing title cannot shrink into another title: ${title}`, () => {
    const n = {
      ...notice,
      title,
      edition: null,
      originalText: `${title}\nExample Library\nApply by 4 November 2026.`,
    };
    const identity = `${sourceTitle}. Example Library.`;
    const s = {
      ...source,
      title: `${sourceTitle} | Example Library`,
      text: `${identity} Apply by 10 November 2026.`,
    };
    const result = run(n, s, { ...analysis, identity_quote: identity });
    assert.equal(result.status, "review");
    assert.equal(result.comparisons[0].verified, false);
  });
}

test("separate institution and title lines do not justify shortening the comparison title", () => {
  const n = {
    ...notice,
    title: "Example Library History",
    edition: null,
    originalText: "Example Library\nHistory\nApply by 4 November 2026.",
  };
  const s = {
    ...source,
    title: "Local History | Example Library",
    text: "Local History. Example Library. Apply by 10 November 2026.",
  };
  const result = run(n, s, {
    ...analysis,
    identity_quote: "Local History. Example Library.",
  });
  assert.equal(result.status, "review");
  assert.equal(result.comparisons[0].verified, false);
});

test("a shorter title is not the title segment of a different specific page", () => {
  for (const [title, otherTitle] of [
    ["History", "Local History"],
    ["Art", "Modern Art"],
    ["Science", "Applied Science"],
  ]) {
    const n = {
      ...notice,
      title,
      edition: null,
      originalText: `${title}\nExample Library\nApply by 4 November 2026.`,
    };
    const identity = `${otherTitle}. Example Library.`;
    const s = {
      ...source,
      title: `${otherTitle} | Example Library`,
      text: `${identity} Apply by 10 November 2026.`,
    };
    const result = run(n, s, { ...analysis, identity_quote: identity });
    assert.equal(result.status, "review", title);
    assert.equal(result.comparisons[0].verified, false);
  }
});

test("a single specific page heading cannot expand a shorter notice title", () => {
  for (const [title, otherTitle] of [
    ["History", "Local History"],
    ["Art", "Modern Art"],
    ["Science", "Applied Science"],
  ]) {
    const n = {
      ...notice,
      title,
      edition: null,
      originalText: `${title}\nExample Library\nApply by 4 November 2026.`,
    };
    const identity = `${otherTitle}. Example Library.`;
    const s = {
      ...source,
      title: otherTitle,
      text: `${identity} Apply by 10 November 2026.`,
    };
    const result = run(n, s, { ...analysis, identity_quote: identity });
    assert.equal(result.status, "review", title);
    assert.equal(result.comparisons[0].verified, false);
  }
});

test("middle-dot institution headings obey the same conflict rules as pipe headings", () => {
  for (const delimiter of ["·", "|", "—", "–"]) {
    const wrong = run(notice, {
      ...source,
      title: `${notice.title} ${delimiter} Another Library`,
    });
    assert.equal(wrong.status, "review", delimiter);
    assert.equal(wrong.comparisons[0].verified, false, delimiter);
    assert.equal(
      run(notice, {
        ...source,
        title: `${notice.title} ${delimiter} Example Library`,
      }).status,
      "changed",
      delimiter,
    );
  }
});

test("unrecognized heading separators cannot disguise an institution conflict", () => {
  for (const separator of [" - ", ": ", " : ", "/", "; "]) {
    const result = run(notice, {
      ...source,
      title: `${notice.title}${separator}Another Library`,
    });
    assert.equal(result.status, "review", separator);
    assert.equal(result.comparisons[0].verified, false);
  }
});

test("a matching institution segment does not excuse another conflicting heading segment", () => {
  for (const title of [
    "2026 Garden workshop · Example Library · Another Library",
    "2026 Garden workshop | Example Library | Local History",
  ]) {
    const result = run(notice, { ...source, title });
    assert.equal(result.status, "review");
    assert.equal(result.comparisons[0].verified, false);
  }
});

// Registered-domain identity: evidence may come from the issuer's own page,
// never from an unregistered site, and nearby conflicts always win.
const nasmNotice: Notice = {
  title: "Fellowships",
  institution: "National Air and Space Museum",
  edition: null,
  country: null,
  originalText:
    "National Air and Space Museum\nFellowships\nApplications Due: December 11, 2026",
  fields: [
    {
      key: "deadline",
      value: "December 11, 2026",
      quote: "Applications Due: December 11, 2026",
    },
  ],
};
const nasmQuote =
  "The National Air and Space Museum's prestigious fellowships give experts and researchers an opportunity to work with the collection.";
const nasmSource: Source = {
  id: "source-0",
  url: "https://airandspace.si.edu/get-involved/fellowships",
  title: "Fellowships | National Air and Space Museum",
  text: `${nasmQuote}\nTimeline\nApplications Due\nDecember 18, 2026\nHow to Apply`,
  authority: "registered",
  institution: "Smithsonian Institution",
  fetchedAt: "2026-11-03T00:00:00Z",
};
const nasmAnalysis: ModelComparison = {
  same_notice: true,
  identity_quote: nasmQuote,
  country: null,
  source_role: "original",
  comparisons: [
    {
      key: "deadline",
      before: "December 11, 2026",
      after: "December 18, 2026",
      before_quote: "Applications Due: December 11, 2026",
      after_quote: "December 18, 2026",
      relation: "changed",
    },
  ],
  summary: "",
  next_action: "",
};

test("a registered issuer's dedicated page confirms a category-titled notice", () => {
  const result = run(nasmNotice, nasmSource, nasmAnalysis);
  assert.equal(result.status, "changed");
  assert.equal(result.comparisons[0].verified, true);
  assert.equal(result.comparisons[0].after, "December 18, 2026");
});

test("dedicated-page identity still rejects every borrowed-evidence conflict", () => {
  const cases: [string, Partial<Source>, Partial<ModelComparison>?][] = [
    ["unregistered site", { authority: "unverified" }],
    [
      "another issuer heading",
      { title: "Fellowships | Smithsonian Libraries" },
    ],
    [
      "three-part heading",
      { title: "Fellowships | Archive | National Air and Space Museum" },
    ],
    [
      "hosted by another issuer",
      {
        text: `${nasmQuote} Hosted by Smithsonian Libraries.\nApplications Due\nDecember 18, 2026`,
      },
    ],
    [
      "archived page",
      {
        text: `${nasmQuote} This is an archived page.\nApplications Due\nDecember 18, 2026`,
      },
    ],
    ["model says different notice", {}, { same_notice: false }],
    ["quote missing the title", {}, { identity_quote: "Timeline" }],
  ];
  for (const [label, sourceChange, analysisChange] of cases) {
    const result = run(
      nasmNotice,
      { ...nasmSource, ...sourceChange },
      { ...nasmAnalysis, ...(analysisChange || {}) },
    );
    assert.equal(result.status, "review", label);
    assert.equal(result.comparisons[0].verified, false, label);
  }
});

test("borrowed institution or edition near the quote is checked for nearby edition conflicts", () => {
  const n: Notice = {
    ...notice,
    title: "Garden workshop",
    edition: "2026",
  };
  const quote = "Garden workshop applications are open.";
  const base: Source = {
    ...source,
    title: "Garden workshop | Example Library",
    text: `Example Library. ${quote} 2026 season. Apply by 10 November 2026.`,
  };
  const a: ModelComparison = { ...analysis, identity_quote: quote };
  assert.equal(run(n, base, a).status, "changed");
  for (const text of [
    `Example Library. ${quote} 2025 season. Apply by 10 November 2026.`,
    `${quote} Organised by Another Library. Apply by 10 November 2026.`,
  ])
    assert.equal(run(n, { ...base, text }, a).status, "review", text);
  // Without the dedicated heading, the issuer must appear near the quote.
  assert.equal(
    run(
      n,
      {
        ...base,
        title: "Garden workshop",
        text: `${quote} 2026 season. Apply by 10 November 2026.`,
      },
      a,
    ).status,
    "review",
  );
});
