import test from "node:test";
import assert from "node:assert/strict";
import { assembleResult } from "../src/lib/compare";
import { htmlText } from "../src/lib/source";
import type { ModelComparison, Notice, Source } from "../src/lib/schema";

// Network-free reconstruction of a reported iPhone check of a Korean festival
// notice. The page below is a constructed fixture that mirrors the structure of
// a public magazine article (a heading, a sentence and a label/value table);
// it is not a copy of that article, and the model outputs are constructed. The
// user's actual image, extraction and model response were not preserved.
const articleHtml = `<html><head><title>수산제의 가을 축제 | 지역 매거진</title></head><body><main>
<h1>수산제의 가을 축제</h1>
<p>제4회 수산제농경문화제가 2026년 11월 14일부터 15일까지 수산제역사공원 일원에서 열린다.</p>
<h2>행사 일정과 장소</h2>
<table><tbody>
<tr><th>행사명</th><td>제4회 수산제농경문화제</td></tr>
<tr><th>기간</th><td>2026년 11월 14일 토요일부터 11월 15일 일요일까지</td></tr>
<tr><th>장소</th><td>수산제역사공원 일원</td></tr>
<tr><th>주최</th><td>밀양시</td></tr>
</tbody></table>
<p>행사장에는 볏짚 조형물과 체험 공간이 마련된다.</p>
</main></body></html>`;
const page = htmlText(articleHtml);

// Poster as photographed: the printed title has a space the article omits.
const poster: Notice = {
  title: "제4회 수산제 농경문화제",
  institution: "밀양시",
  edition: null,
  country: "KR",
  originalText:
    "제4회 수산제 농경문화제\n일시: 2026. 11. 14 ~ 15\n장소: 수산제역사공원 일원\n주최: 밀양시",
  fields: [
    {
      key: "location",
      value: "수산제역사공원 일원",
      quote: "장소: 수산제역사공원 일원",
    },
  ],
};
const exactTitle: Notice = {
  ...poster,
  title: "제4회 수산제농경문화제",
  originalText: poster.originalText.replace(
    "제4회 수산제 농경문화제",
    "제4회 수산제농경문화제",
  ),
};

function source(
  url: string,
  text = page.text,
  title = url === article ? page.title : genericHeading,
): Source {
  return {
    id: "source-0",
    url,
    title,
    text,
    authority: url.includes("seoul.go.kr") ? "registered" : "unverified",
    fetchedAt: "2026-11-04T00:00:00Z",
  };
}
// The article host is not registered; seoul.go.kr with a generic heading
// stands in for a hypothetical registered page so identity rules can be
// examined alone. (The article's own headline would also fail as a specific,
// different page heading.)
const article = "https://magazine.example/10448";
const registered = "https://www.seoul.go.kr/news/news_notice.do?nttNo=1";
const genericHeading = "공지사항 | 밀양시";

function analysis(
  identityQuote: string,
  afterQuote = "장소 | 수산제역사공원 일원",
  after = "수산제역사공원 일원",
): ModelComparison {
  return {
    same_notice: true,
    identity_quote: identityQuote,
    country: "KR",
    source_role: "original",
    comparisons: [
      {
        key: "location",
        before: "수산제역사공원 일원",
        after,
        before_quote: "장소: 수산제역사공원 일원",
        after_quote: afterQuote,
        relation: after === "수산제역사공원 일원" ? "same" : "changed",
      },
    ],
    summary: "",
    next_action: "",
  };
}

function check(notice: Notice, src: Source, model: ModelComparison) {
  const diagnostics: string[] = [];
  const result = assembleResult({
    id: "test",
    notice,
    sources: [src],
    analyses: [model],
    lang: "ko",
    checkedAt: "2026-11-04T00:00:00Z",
    diagnostics,
  });
  return { result, diagnostics };
}

test("table cells keep a visible boundary so a label is never glued to its value", () => {
  assert.ok(page.text.includes("행사명 | 제4회 수산제농경문화제"));
  assert.ok(page.text.includes("장소 | 수산제역사공원 일원"));
  assert.ok(!page.text.includes("행사명제4회"));
  assert.ok(!page.text.includes("장소수산제"));
  // Cell values themselves are unchanged.
  assert.ok(
    page.text.includes("2026년 11월 14일 토요일부터 11월 15일 일요일까지"),
  );
});

test("an unregistered article never confirms, however well it matches", () => {
  const { result } = check(
    exactTitle,
    source(article),
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(result.status, "review");
  assert.ok(result.warnings.includes("authority"));
  assert.ok(result.comparisons.every((field) => !field.verified));
});

test("Korean spacing and attached particles are not treated as the same title", () => {
  // Poster "수산제 농경문화제" versus page "수산제농경문화제": still review.
  let run = check(
    poster,
    source(registered),
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(run.result.status, "review");
  assert.ok(run.diagnostics.includes("title_not_in_quote"));
  // "…문화제가" carries a particle directly after the title: still review.
  run = check(
    exactTitle,
    source(registered),
    analysis(
      "제4회 수산제농경문화제가 2026년 11월 14일부터 15일까지 수산제역사공원 일원에서 열린다.",
    ),
  );
  assert.equal(run.result.status, "review");
  assert.ok(run.diagnostics.includes("title_not_in_quote"));
});

test("with the table boundary, an exact title in a registered table row is identified", () => {
  const { result, diagnostics } = check(
    exactTitle,
    source(registered),
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.deepEqual(diagnostics, []);
  assert.ok(!result.warnings.includes("identity"));
  assert.equal(result.comparisons[0].verified, true);
  // The same quote in the previously glued form cannot match the title.
  const glued = check(
    exactTitle,
    source(registered, page.text.replaceAll(" | ", "")),
    analysis("행사명제4회 수산제농경문화제", "장소수산제역사공원 일원"),
  );
  assert.ok(glued.diagnostics.includes("title_not_in_quote"));
});

test("Korean counterexamples stay in review", () => {
  const base = source(registered);
  // Another edition.
  let run = check(
    { ...exactTitle, title: "제3회 수산제농경문화제" },
    base,
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(run.result.status, "review");
  // Another institution.
  run = check(
    { ...exactTitle, institution: "김해시" },
    base,
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(run.result.status, "review");
  // Another event on the page.
  run = check(
    { ...exactTitle, title: "제4회 수산제짚풀공예대회" },
    base,
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(run.result.status, "review");
  // A fabricated source quote.
  run = check(
    exactTitle,
    base,
    analysis(
      "행사명 | 제4회 수산제농경문화제",
      "장소 | 밀양강 둔치",
      "밀양강 둔치",
    ),
  );
  assert.equal(run.result.status, "review");
  assert.equal(run.result.comparisons[0].verified, false);
  // An archived page.
  run = check(
    exactTitle,
    source(registered, `이 페이지는 보관된 자료입니다.\n${page.text}`),
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(run.result.status, "review");
  assert.ok(run.diagnostics.includes("page_archived"));
});

test("a value from another event's table rows is not confirmed for this event", () => {
  const twoEvents = htmlText(`<main>
<table>
<tr><th>행사명</th><td>제4회 수산제농경문화제</td></tr>
<tr><th>장소</th><td>수산제역사공원 일원</td></tr>
<tr><th>주최</th><td>밀양시</td></tr>
</table>
<table>
<tr><th>행사명</th><td>밀양 농산물 한마당</td></tr>
<tr><th>장소</th><td>밀양강 둔치</td></tr>
</table></main>`).text;
  const run = check(
    exactTitle,
    source(registered, twoEvents, genericHeading),
    analysis(
      "행사명 | 제4회 수산제농경문화제",
      "장소 | 밀양강 둔치",
      "밀양강 둔치",
    ),
  );
  assert.equal(run.result.status, "review");
  assert.ok(run.diagnostics.includes("field_scope"));
  // Its own rows still verify.
  const own = check(
    exactTitle,
    source(registered, twoEvents, genericHeading),
    analysis("행사명 | 제4회 수산제농경문화제"),
  );
  assert.equal(own.result.comparisons[0].verified, true);
});

test("per-candidate outcomes say what happened to each source", () => {
  const result = assembleResult({
    id: "test",
    notice: exactTitle,
    sources: [{ ...source(registered), id: "source-0" }],
    analyses: [analysis("행사명 | 제4회 수산제농경문화제")],
    lang: "ko",
    checkedAt: "2026-11-04T00:00:00Z",
    warnings: ["source_too_large"],
    attempts: [
      {
        url: "https://large.example/notice",
        outcome: "fetch_failed",
        code: "source_too_large",
      },
      { url: registered, outcome: "compared", sourceId: "source-0" },
    ],
  });
  assert.deepEqual(result.attempts, [
    {
      url: "https://large.example/notice",
      outcome: "fetch_failed",
      code: "source_too_large",
    },
    {
      url: registered,
      outcome: "compared",
      sourceId: "source-0",
      authority: "registered",
      identity: "ok",
      section: false,
      verified: 1,
      fields: 1,
    },
  ]);
  // Identity failures are named by category, without notice or source text.
  const spaced = assembleResult({
    id: "test",
    notice: poster,
    sources: [{ ...source(registered), id: "source-0" }],
    analyses: [analysis("행사명 | 제4회 수산제농경문화제")],
    lang: "ko",
    attempts: [{ url: registered, outcome: "compared", sourceId: "source-0" }],
  });
  assert.equal(spaced.attempts?.[0].identity, "title");
  assert.equal(spaced.attempts?.[0].verified, 0);
  // Without attempts (demo or older results) the field stays absent.
  assert.equal(
    assembleResult({
      id: "test",
      notice: exactTitle,
      sources: [],
      analyses: [],
      lang: "ko",
    }).attempts,
    undefined,
  );
});
