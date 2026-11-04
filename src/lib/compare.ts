import {
  normalize,
  type FieldComparison,
  type ModelComparison,
  type Notice,
  type Result,
  type Source,
} from "./schema";
import type { ResultLang } from "./languages";

function exactExcerpt(
  text: string,
  excerpt: string | null | undefined,
): boolean {
  return !!excerpt?.trim() && text.includes(excerpt);
}

// These guards deliberately accept a small set of explicit assertions. A model's
// role label or a cancellation word alone is not evidence of a current decision.
const cancellationWord =
  /\bcancell?(?:ed|ation)\b|취소|中止|取消|annul|cancelad|abgesagt|отмен|إلغاء/iu;
const uncertainContext =
  /\b(?:if|unless|may|might|could|would|should|not|never|previously|previous|historical|archive|archived|formerly|last year|rumou?r|hypothetical|reported|said|quoted|another|other event|rescinded|reversed|reinstated)\b|isn['’]t|wasn['’]t|["“”‘’]|경우|하면|아니|않|없|지난|작년|인용|철회/iu;

function cancellationEvidence(notice: Notice, text: string) {
  const title = notice.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const explicit = new RegExp(
    `^(?:(?:the|this) (?:event|workshop|programme|program)|${title}) (?:is|has been) (cancell?ed)[.!]?$|^(?:status: )(cancell?ed)[.!]?$|^(?:상태: )?(취소(?:됨|되었습니다|합니다)?)[.!]?$|^(?:이 행사(?:는|가) )(취소되었습니다)[.!]?$`,
    "iu",
  );
  const sentences = text
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((part) => part.trim());
  for (const [index, quote] of sentences.entries()) {
    const match = explicit.exec(quote);
    const value = match?.slice(1).find(Boolean);
    if (!value) continue;
    const previous = sentences[index - 1] || "";
    const next = sentences[index + 1] || "";
    // Scope ambiguity to the assertion and connected clauses. Month names,
    // refund policies and quoted titles elsewhere are not cancellation claims.
    const precedingCondition =
      /\b(?:if|unless|provided|assuming|previously|historical|archive|archived|last year|rumou?r|hypothetical|reported|said|quoted|another|other event)\b|경우|하면|지난|작년|인용/iu.test(
        previous,
      );
    const connectedReversal =
      /\b(?:decision|cancellation|statement|announcement|event|it|this)\b.*\b(?:rescinded|reversed|reinstated|withdrawn|incorrect|false|not true)\b|(?:취소|결정|공지).*(?:철회|번복|아니)/iu.test(
        next,
      );
    const competingCancellation = sentences.some(
      (sentence, position) =>
        position !== index &&
        cancellationWord.test(sentence) &&
        (uncertainContext.test(sentence) || !explicit.test(sentence)),
    );
    if (
      !uncertainContext.test(quote) &&
      !precedingCondition &&
      !connectedReversal &&
      !competingCancellation
    )
      return { value, quote };
  }
  return null;
}

function editionMarkers(text: string): Map<string, Set<string>> {
  const markers = new Map<string, Set<string>>();
  const add = (kind: string, value: string) => {
    const values = markers.get(kind) || new Set<string>();
    values.add(value.toLowerCase());
    markers.set(kind, values);
  };
  for (const match of text.matchAll(/\b(?:19|20)\d{2}\b/g))
    add("year", match[0]);
  for (const match of text.matchAll(
    /\b(session|round|edition|cohort|cycle|season|batch)\s*[-:#]?\s*(\d+|[ivx]+)\b/gi,
  ))
    add(match[1].toLowerCase(), match[2]);
  for (const match of text.matchAll(
    /\b(\d+)(?:st|nd|rd|th)\s+(session|round|edition|cohort|cycle|season|batch)\b/gi,
  ))
    add(match[2].toLowerCase(), match[1]);
  for (const match of text.matchAll(/제?\s*(\d+)\s*(회|차|기)/g))
    add(match[2], match[1]);
  return markers;
}

// Line breaks on a printed notice often become a space next to a bracket or
// punctuation mark ("인턴십 (여름" for "인턴십(여름"). Only that whitespace is
// ignored; every letter, digit and mark must still match.
function tight(value: string): string {
  return value.replace(
    /\s*([()[\]{}「」『』《》〈〉<>,.:;·/~|\-–—])\s*/gu,
    "$1",
  );
}

function identifierIn(text: string, identifier: string): boolean {
  if (!identifier) return false;
  const escaped = tight(identifier).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(tight(text));
}

// On a registered official domain only, identity evidence may come from the
// page itself instead of the single quoted excerpt. Borrowed evidence is vetoed
// by nearby text naming another issuer, another edition or an archive.
const issuerPhrase =
  /\b(?:issued|hosted|organi[sz]ed|presented)\s+by\s+([^.;\n]{2,80})|(?:주최|주관)\s*[:：]?\s*([^.\n]{2,40})/giu;
const archiveContext =
  /\b(?:archived?|past events?|previous (?:events?|editions?|years?)|no longer (?:current|available|valid)|this page is for|current event)\b|지난 행사|이전 회차|보관 자료|종료된 행사/iu;
// Category words that name a listing rather than one programme or event.
const listingTitle =
  /^(?:events?|notices?|announcements?|updates?|news|calendar|workshops?|programmes?|programs?|공지사항|공지|새소식|행사|행사안내|お知らせ|イベント|ニュース|通知|公告|活动)$/u;

function quoteWindow(text: string, quote: string): string {
  const at = text.indexOf(quote);
  if (at < 0) return "";
  return text.slice(Math.max(0, at - 400), at + quote.length + 400);
}

function contextConflicts(
  notice: Notice,
  institution: string,
  window: string,
): boolean {
  if (archiveContext.test(window)) return true;
  for (const match of window.matchAll(issuerPhrase)) {
    const issuer = normalize(match[1] || match[2] || "");
    if (issuer && (!institution || !issuer.includes(institution))) return true;
  }
  const expected = editionMarkers(`${notice.title} ${notice.edition || ""}`);
  for (const [kind, values] of editionMarkers(window)) {
    const wanted = expected.get(kind);
    if (wanted && [...values].some((value) => !wanted.has(value))) return true;
  }
  return false;
}

// An edition label written directly next to the notice title, such as
// "2027 Garden Workshop", "Garden Workshop (Round 2)" or "제3회 정원 워크숍".
const markerSource =
  "(?<![\\p{L}\\p{N}])(?:(?:19|20)\\d{2}|(?:session|round|edition|cohort|cycle|season|batch)\\s*[-:#]?\\s*(?:\\d+|[ivx]+)|\\d+(?:st|nd|rd|th)\\s+(?:session|round|edition|cohort|cycle|season|batch)|제?\\s*\\d+\\s*(?:회|차|기))";
const leadingMarker = new RegExp(`${markerSource}\\s*[-–:·]?\\s*$`, "iu");
const trailingMarker = new RegExp(
  `^\\s*[-–:,(\\[]?\\s*${markerSource}(?![\\p{L}\\p{N}])`,
  "iu",
);

/**
 * A page may list several editions of the same programme. The changed value
 * must not come from a section whose nearest heading names this title with a
 * different edition, even when the identity quote elsewhere is correct.
 */
function otherEditionScope(
  notice: Notice,
  sourceText: string,
  afterQuote: string,
): boolean {
  const expected = editionMarkers(`${notice.title} ${notice.edition || ""}`);
  if (!expected.size) return false;
  const base = normalize(notice.title)
    .replace(new RegExp(markerSource, "giu"), " ")
    .replace(normalize(notice.institution) || "\0", " ")
    .replace(/[\s:·.,!()|/—–-]+/g, " ")
    .trim();
  if (base.length < 4) return false;
  const text = normalize(sourceText);
  const at = text.indexOf(normalize(afterQuote));
  if (at < 0) return false;
  const end = at + normalize(afterQuote).length;
  const window = text.slice(Math.max(0, at - 300), end);
  const offset = Math.max(0, at - 300);
  let nearest = -1;
  for (let i = window.indexOf(base); i >= 0; i = window.indexOf(base, i + 1))
    nearest = i;
  if (nearest < 0) return false;
  const start = offset + nearest;
  const before = text.slice(Math.max(0, start - 24), start);
  const after = text.slice(start + base.length, start + base.length + 20);
  const label = [
    before.match(leadingMarker)?.[0],
    after.match(trailingMarker)?.[0],
  ]
    .filter(Boolean)
    .join(" ");
  for (const [kind, values] of editionMarkers(label)) {
    const wanted = expected.get(kind);
    if (wanted && [...values].some((value) => !wanted.has(value))) return true;
  }
  return false;
}

// Statements that the whole page is no longer current. Unlike the nearby
// archiveContext words, these are checked on every identity path, so a page
// headed "This page is an archive" never confirms a change even when the quote
// itself names the title, institution and edition.
const pageArchive =
  /\b(?:this (?:page|event|notice|announcement|programme|program|competition|content|information|news (?:article|story)|article|guidance) (?:is|has been|was) (?:an? )?(?:archived?|no longer (?:current|valid|available|being updated|updated)|superseded|replaced|withdrawn|out of date)|this is an archived? (?:page|version|copy)|(?:has been|was) (?:superseded|withdrawn)(?: on| by|[.:])|no longer (?:current|valid|being updated))\b|(?:이 (?:페이지|공고|게시물|행사|안내)는 )(?:보관|종료|지난)|보관(?:된)? (?:자료|페이지|게시물)입니다|종료된 (?:행사|공고|사업|모집)입니다/iu;

// Site and label words that never name a programme.
const generalLabel =
  /(?<![\p{L}\p{N}])(?:official|notices?|updates?|amendments?|cancellations?|workshops?|events?|announcements?|pages?|home|news|calendar|list|category|categories|programmes?|programs?|actualités|événements|agenda|accueil|avis|noticias|eventos|inicio|aviso|veranstaltungen|nachrichten|startseite|termine|novidades|início|мероприятия|новости|главная)(?![\p{L}\p{N}])/gu;
const generalLabelCjk =
  /공지사항|공지|서울소식|새소식|소식|고시·공고|고시공고|행사안내|행사|프로그램|홈|목록|お知らせ|イベント|ニュース|一覧|ホーム|通知|公告|活动|首頁|首页|الأخبار|الفعاليات|الرئيسية/gu;
const updateLabel =
  /^(?:(?:19|20)\d{2}\s+)?(?:updates?|amendments?|notices?|recruitment|vacanc(?:y|ies)|수정 안내|모집|채용|synthetic example|합성 예시)$/u;

function labelResidue(text: string, institution: string): string {
  return text
    .replace(institution || "\0", "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(generalLabel, "")
    .replace(generalLabelCjk, "")
    .replace(/[\s:·.,!()|/—–-]/g, "");
}

// The site's own name in a heading ("… - GOV.UK", "… | Smithsonian
// Institution") is neutral, like a generic label.
function siteLabel(part: string, source: Source): boolean {
  let host = "";
  try {
    host = new URL(source.url).hostname.toLowerCase();
  } catch {
    /* unparsable URLs have no site label */
  }
  const label = part.trim();
  if (source.institution && label === normalize(source.institution))
    return true;
  return (
    !!host &&
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(label) &&
    (host === label || host.endsWith("." + label))
  );
}

/**
 * The other parts of a page heading once the complete notice title is removed
 * as one segment ("Title | Institution", "Title - GOV.UK", "Events | Title"),
 * or null when the title is not a whole segment ("History" in "Local History").
 */
function headingRest(sourceTitle: string, title: string): string[] | null {
  const heading = tight(sourceTitle);
  const wanted = tight(title);
  if (!wanted) return null;
  const separator = /[|—–·:-]/u;
  for (
    let at = heading.indexOf(wanted);
    at >= 0;
    at = heading.indexOf(wanted, at + 1)
  ) {
    const before = heading.slice(0, at);
    const after = heading.slice(at + wanted.length);
    if (before && !separator.test(before.slice(-1))) continue;
    if (after && !separator.test(after[0])) continue;
    return `${before}|${after}`
      .split(/[|—–·:-]+/u)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return null;
}

// Words that describe a section or an action, never a programme's name.
const sectionWords = new Set([
  "the",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "on",
  "and",
  "or",
  "at",
  "by",
  "with",
  "from",
  "our",
  "your",
  "you",
  "we",
  "this",
  "that",
  "these",
  "is",
  "are",
  "be",
  "will",
  "can",
  "must",
  "should",
  "why",
  "how",
  "what",
  "when",
  "where",
  "who",
  "more",
  "about",
  "all",
  "new",
  "now",
  "open",
  "opens",
  "close",
  "closes",
  "closing",
  "closed",
  "due",
  "until",
  "date",
  "dates",
  "deadline",
  "deadlines",
  "time",
  "timeline",
  "schedule",
  "key",
  "important",
  "overview",
  "detail",
  "details",
  "information",
  "info",
  "apply",
  "applying",
  "application",
  "applications",
  "entry",
  "entries",
  "enter",
  "submit",
  "submission",
  "how",
  "eligibility",
  "eligible",
  "requirement",
  "requirements",
  "contact",
  "note",
  "notes",
  "terms",
  "conditions",
  "general",
  "process",
  "fee",
  "fees",
  "cost",
  "costs",
  "location",
  "venue",
  "register",
  "registration",
  "notice",
  "notices",
  "update",
  "updates",
  "announcement",
  "additional",
  "other",
  "further",
  "see",
  "read",
  "find",
  "out",
  "learn",
  "모집",
  "공고",
  "공고문",
  "안내",
  "개요",
  "일정",
  "신청",
  "접수",
  "대상",
  "방법",
  "내용",
  "기간",
  "문의",
  "참고",
  "기타",
  "제출",
  "서류",
  "선발",
  "결과",
  "발표",
  "마감",
  "자격",
  "장소",
  "시간",
  "비용",
  "유의사항",
]);

// Lead-in words a page heading may wrap around a complete notice title.
const leadInWords = new Set([
  "competition",
  "contest",
  "call",
  "join",
  "become",
  "win",
  "announcing",
  "introducing",
  "take",
  "part",
  "recruiting",
  "recruitment",
  "vacancy",
  "launch",
  "launches",
  "launched",
  "invite",
  "invites",
  "invitation",
]);

function nameTokens(text: string, institution: string): Set<string> {
  const skip = new Set(
    normalize(institution)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
  const tokens = new Set<string>();
  for (let token of normalize(text).split(/[^\p{L}\p{N}]+/u)) {
    if (!token || /\p{N}/u.test(token)) continue;
    if (/^\p{Script=Hangul}{3,}$/u.test(token))
      token = token.replace(
        /(?:에서|으로|은|는|이|가|을|를|의|에|로|과|와|도)$/u,
        "",
      );
    else if (/^[a-z]{4,}s$/.test(token)) token = token.slice(0, -1);
    if (token.length < 2 || sectionWords.has(token) || skip.has(token))
      continue;
    tokens.add(token);
  }
  return tokens;
}

/**
 * The text that labels a quoted value: its own inline lead-in ("Music
 * Workshop: apply by …"), else the nearest short heading-like lines above it.
 * A label that shares part of the notice's name but adds a different name
 * ("Music Workshop" for "Garden Workshop") marks another programme's section.
 */
function otherSectionScope(
  notice: Notice,
  sourceText: string,
  afterQuote: string,
): boolean {
  const at = sourceText.indexOf(afterQuote);
  if (at < 0) return false;
  const title = normalize(notice.title);
  if (identifierIn(normalize(afterQuote), title)) return false;
  const wanted = nameTokens(notice.title, notice.institution);
  if (!wanted.size) return false;
  const verdict = (label: string): "same" | "other" | "neutral" => {
    if (identifierIn(normalize(label), title)) return "same";
    const found = nameTokens(label, notice.institution);
    const shared = [...found].some((token) => wanted.has(token));
    if (!shared) return "neutral";
    const extra = [...found].some((token) => !wanted.has(token));
    const missing = [...wanted].some((token) => !found.has(token));
    return extra && missing ? "other" : "same";
  };
  const lineStart = sourceText.lastIndexOf("\n", at - 1) + 1;
  const lead =
    sourceText
      .slice(lineStart, at)
      .split(/[.!?。;]\s/u)
      .pop() || "";
  if (lead.trim()) {
    const result = verdict(lead);
    if (result !== "neutral") return result === "other";
  }
  const above = sourceText.slice(Math.max(0, lineStart - 600), lineStart);
  const lines = above.split("\n").slice(0, -1).reverse().slice(0, 10);
  for (const line of lines) {
    const text = line.trim();
    if (text.length < 2 || text.length > 90 || /[.!?。]$/u.test(text)) continue;
    const result = verdict(text);
    if (result !== "neutral") return result === "other";
  }
  return false;
}

// Fixed reason codes (no notice or source text) for operational diagnostics.
export type IdentityReason =
  | "model_different"
  | "quote_not_exact"
  | "country"
  | "title_generic"
  | "title_not_in_quote"
  | "institution_generic"
  | "institution_missing"
  | "edition_missing"
  | "context_conflict"
  | "page_archived"
  | "heading_other"
  | "edition_marker";

function sameIdentity(
  notice: Notice,
  source: Source,
  quote: string,
): IdentityReason | null {
  const identity = normalize(quote);
  // Compare the complete supplied title; never infer a shorter event name.
  const title = normalize(notice.title);
  const institution = normalize(notice.institution);
  const sourceTitle = normalize(source.title);
  const registered = source.authority === "registered";
  // A general category, even with an institution, cannot identify one notice.
  const specificTitle = title
    .replace(institution || "\0", "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(
      /(?<![\p{L}\p{N}])(?:research|fellowships?|programmes?|programs?|notices?|announcements?|events?|workshops?|updates?)(?![\p{L}\p{N}])/gu,
      "",
    )
    .replace(/공지사항|공지|お知らせ|通知|公告/gu, "")
    .replace(/[\s:·.,!()|/—–-]/g, "");
  let rest = headingRest(sourceTitle, title);
  if (rest === null) {
    // A sentence-style heading that only adds lead-in words around the
    // complete title ("Enter our competition to be a <title>") still names it.
    const parts = sourceTitle.split(/\s*[|—–·]\s*|\s+-\s+/u);
    const index = parts.findIndex(
      (part) =>
        identifierIn(part, title) &&
        [...nameTokens(part, notice.institution)].every(
          (token) =>
            leadInWords.has(token) ||
            nameTokens(notice.title, notice.institution).has(token),
        ),
    );
    if (index >= 0)
      rest = parts.filter((_part, i) => i !== index).map((part) => tight(part));
  }
  // ...except an issuer's own registered page titled exactly
  // "<title> | <institution>" (e.g. "Fellowships | National Air and Space
  // Museum"), unless the title merely names a listing such as "Events".
  const restNames = rest?.filter((part) => !siteLabel(part, source)) || [];
  const dedicatedPage =
    registered &&
    !!institution &&
    !listingTitle.test(title) &&
    restNames.length === 1 &&
    restNames[0] === tight(institution);
  if (!specificTitle && !dedicatedPage) return "title_generic";
  if (!identifierIn(identity, title)) return "title_not_in_quote";
  if (/^(?:library|museum|university|도서관|図書館)$/u.test(institution))
    return "institution_generic";
  const window = normalize(quoteWindow(source.text, quote));
  // Institution and edition belong in the quoted excerpt. A registered page may
  // supply them from its dedicated heading or the text around the quote.
  let borrowed = !specificTitle;
  if (institution && !identifierIn(identity, institution)) {
    if (!registered || !(dedicatedPage || identifierIn(window, institution)))
      return "institution_missing";
    borrowed = true;
  }
  if (notice.edition && !identifierIn(identity, normalize(notice.edition))) {
    const edition = normalize(notice.edition);
    if (
      !registered ||
      !(identifierIn(window, edition) || identifierIn(sourceTitle, edition))
    )
      return "edition_missing";
    borrowed = true;
  }
  if (borrowed && contextConflicts(notice, institution, window))
    return "context_conflict";
  // A page that says it is archived, superseded or withdrawn is never current,
  // whatever the quote contains. Borrowed dedicated-page identity also yields
  // to the looser archive words anywhere on the page.
  const page = normalize(source.text);
  if (pageArchive.test(page)) return "page_archived";
  if (borrowed && dedicatedPage && archiveContext.test(page))
    return "page_archived";
  // A generic page label can add no identity evidence. A specific, different
  // heading must not be overridden by an unrelated matching paragraph below it.
  // "History" must not match "Local History | Library"; site names such as
  // "GOV.UK" and generic labels such as "Events" stay neutral.
  const genericTitle = labelResidue(
    sourceTitle
      .split(/\s*[|—–·]\s*|\s+-\s+/u)
      .filter((part) => !siteLabel(part, source))
      .join(" "),
    institution,
  );
  if (
    genericTitle &&
    (rest === null ||
      rest.some(
        (part) =>
          !siteLabel(part, source) &&
          part !== tight(institution) &&
          !updateLabel.test(part) &&
          !!labelResidue(part, institution),
      ))
  )
    return "heading_other";

  const expected = editionMarkers(`${notice.title} ${notice.edition || ""}`);
  for (const text of [quote, source.title]) {
    for (const [kind, values] of editionMarkers(text)) {
      const wanted = expected.get(kind);
      if (wanted && [...values].some((value) => !wanted.has(value)))
        return "edition_marker";
    }
  }
  return null;
}

function ambiguousNumericDate(value: string | null): boolean {
  // Find date components even inside sentences or followed by a time. Exclude
  // year-first ISO dates; neither locale nor a model can disambiguate 03/04.
  return [
    ...(value || "").matchAll(
      /(?<![\d/.-])(\d{1,2})([/.\-])(\d{1,2})(?:\2\d{2,4})?(?![\d/.-])/g,
    ),
  ].some(
    (match) =>
      Number(match[1]) >= 1 &&
      Number(match[1]) <= 12 &&
      Number(match[3]) >= 1 &&
      Number(match[3]) <= 12 &&
      match[1] !== match[3],
  );
}

export function verifyComparison(
  notice: Notice,
  source: Source,
  model: ModelComparison,
): {
  fields: FieldComparison[];
  identity: boolean;
  identityReason: IdentityReason | null;
  scopeRejected: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const identityReason: IdentityReason | null = !model.same_notice
    ? "model_different"
    : !exactExcerpt(source.text, model.identity_quote)
      ? "quote_not_exact"
      : notice.country &&
          model.country &&
          notice.country.toUpperCase() !== model.country.toUpperCase()
        ? "country"
        : sameIdentity(notice, source, model.identity_quote);
  const identity = identityReason === null;
  if (!identity) warnings.push("identity");
  if (source.authority === "unverified") warnings.push("authority");
  const cancellation = cancellationEvidence(notice, source.text);
  const cancellationConcern =
    model.source_role === "cancellation" || cancellationWord.test(source.text);
  let scopeRejected = false;
  const fields = model.comparisons.map((f): FieldComparison => {
    const original = notice.fields.find(
      (x) =>
        x.key === f.key &&
        f.before !== null &&
        x.value === f.before &&
        exactExcerpt(notice.originalText, x.value),
    );
    // Never display a model-rewritten value or quotation as if it were source text.
    const before = original?.value ?? null;
    const after = exactExcerpt(source.text, f.after) ? f.after : null;
    const beforeQuote = exactExcerpt(notice.originalText, f.before_quote)
      ? f.before_quote
      : null;
    const afterQuote = exactExcerpt(source.text, f.after_quote)
      ? f.after_quote
      : null;
    const newCancellation =
      f.key === "status" &&
      f.before === null &&
      f.before_quote === null &&
      !notice.fields.some((field) => field.key === "status") &&
      cancellation?.value === after &&
      exactExcerpt(afterQuote || "", after);
    const quoteSupported =
      identity &&
      source.authority === "registered" &&
      model.source_role !== "unknown" &&
      ((!!original && exactExcerpt(beforeQuote || "", before)) ||
        newCancellation) &&
      exactExcerpt(afterQuote || "", after);
    const ambiguousRelation =
      f.relation === "unclear" ||
      (f.relation === "same" &&
        normalize(f.before || "") !== normalize(f.after || ""));
    const unsupportedCancellation =
      f.key === "status" &&
      (cancellationWord.test(f.after || "") ||
        model.source_role === "cancellation") &&
      (!cancellation ||
        cancellation.value !== after ||
        !exactExcerpt(afterQuote || "", cancellation.quote));
    const ambiguousDate =
      ["deadline", "date"].includes(f.key) &&
      [f.before, f.after].some(ambiguousNumericDate);
    const otherEdition =
      !!afterQuote &&
      (otherEditionScope(notice, source.text, afterQuote) ||
        otherSectionScope(notice, source.text, afterQuote));
    if (otherEdition) scopeRejected = true;
    const verified =
      quoteSupported &&
      !otherEdition &&
      !ambiguousRelation &&
      !unsupportedCancellation &&
      !ambiguousDate;
    const relation =
      !verified || (!newCancellation && f.before === null) || f.after === null
        ? "unclear"
        : normalize(f.before || "") === normalize(f.after)
          ? "same"
          : "changed";
    if (!verified) warnings.push("evidence");
    return {
      key: f.key,
      before,
      after,
      beforeQuote,
      afterQuote,
      sourceId: source.id,
      relation,
      verified,
    };
  });
  if (
    cancellationConcern &&
    !fields.some(
      (field) =>
        field.key === "status" &&
        field.verified &&
        field.after === cancellation?.value,
    )
  )
    warnings.push("evidence");
  return {
    fields,
    identity,
    identityReason,
    scopeRejected,
    warnings: [...new Set(warnings)],
  };
}

export function assembleResult(args: {
  id: string;
  notice: Notice;
  sources: Source[];
  analyses: ModelComparison[];
  lang: ResultLang;
  mode?: "live" | "demo";
  warnings?: string[];
  checkedAt?: string;
  elapsedMs?: number;
  /** Receives fixed reason codes only, for server logs. */
  diagnostics?: string[];
}): Result {
  const { notice, sources, analyses } = args;
  const comparisons: FieldComparison[] = [];
  const warnings = [...(args.warnings || [])];
  let identityFailed = false;
  analyses.forEach((m, i) => {
    if (!sources[i]) return;
    const verified = verifyComparison(notice, sources[i], m);
    if (verified.identityReason)
      args.diagnostics?.push(verified.identityReason);
    if (verified.scopeRejected) args.diagnostics?.push("field_scope");
    comparisons.push(...verified.fields);
    warnings.push(...verified.warnings);
    if (!verified.identity) identityFailed = true;
  });
  const uniqueKeys = new Set(comparisons.map((f) => f.key));
  for (const key of uniqueKeys) {
    const values = new Set(
      comparisons
        .filter((f) => f.key === key && f.verified && f.after)
        .map((f) => normalize(f.after!)),
    );
    if (values.size > 1) warnings.push("conflict");
  }
  const checkedAt = args.checkedAt || new Date().toISOString();
  const verified = comparisons.filter((f) => f.verified);
  const hasUnverified = comparisons.some((f) => !f.verified);
  const partial = notice.fields.some(
    (f) =>
      !verified.some(
        (v) =>
          v.key === f.key && normalize(v.before || "") === normalize(f.value),
      ),
  );
  if (partial) warnings.push("partial");
  const incompleteSources = warnings.some(
    (warning) =>
      ["search", "budget", "network", "fetch"].includes(warning) ||
      warning.startsWith("source_"),
  );
  const cancelled = analyses.some((_a, i) =>
    comparisons.some(
      (f) =>
        f.sourceId === sources[i]?.id &&
        f.key === "status" &&
        f.verified &&
        /^(cancelled|canceled|취소(?:됨|되었습니다|합니다)?)[.!]?$/iu.test(
          f.after || "",
        ),
    ),
  );
  const expired = verified.some(
    (f) =>
      f.key === "deadline" &&
      validExplicitTimestamp(f.after || "") &&
      Date.parse(f.after!) < Date.parse(checkedAt),
  );
  const status = !sources.length
    ? "unavailable"
    : !verified.length ||
        identityFailed ||
        hasUnverified ||
        partial ||
        incompleteSources ||
        warnings.includes("conflict") ||
        warnings.includes("evidence")
      ? "review"
      : cancelled
        ? "cancelled"
        : expired
          ? "expired"
          : verified.some((f) => f.relation === "changed")
            ? "changed"
            : "matched";
  return {
    id: args.id,
    mode: args.mode || "live",
    status,
    title: notice.title,
    institution: notice.institution,
    country: notice.country,
    checkedAt,
    expiresAt:
      args.mode === "demo"
        ? null
        : new Date(Date.parse(checkedAt) + 86400000).toISOString(),
    comparisons,
    sources: sources.map(({ text: _text, ...s }) => s),
    candidates: [],
    warnings: [...new Set(warnings)],
    lang: args.lang,
    elapsedMs: args.elapsedMs || 0,
  };
}

export function validExplicitTimestamp(value: string): boolean {
  const match =
    /^(\d{4})-(\d\d)-(\d\d)T\d\d:\d\d(?::\d\d)?(?:Z|[+-]\d\d:\d\d)$/.exec(
      value,
    );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day] = match;
  return (
    Number(month) >= 1 &&
    Number(month) <= 12 &&
    Number(day) >= 1 &&
    Number(day) <=
      new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
  );
}
