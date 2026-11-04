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

function identifierIn(text: string, identifier: string): boolean {
  if (!identifier) return false;
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(text);
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

function sameIdentity(notice: Notice, source: Source, quote: string): boolean {
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
  const headingParts = sourceTitle.split(/\s*[|—–·]\s*/u);
  // ...except an issuer's own registered page titled exactly
  // "<title> | <institution>" (e.g. "Fellowships | National Air and Space
  // Museum"), unless the title merely names a listing such as "Events".
  const dedicatedPage =
    registered &&
    !!institution &&
    !listingTitle.test(title) &&
    headingParts.length === 2 &&
    headingParts.includes(title) &&
    headingParts.includes(institution);
  if ((!specificTitle && !dedicatedPage) || !identifierIn(identity, title))
    return false;
  if (/^(?:library|museum|university|도서관|図書館)$/u.test(institution))
    return false;
  const window = normalize(quoteWindow(source.text, quote));
  // Institution and edition belong in the quoted excerpt. A registered page may
  // supply them from its dedicated heading or the text around the quote.
  let borrowed = !specificTitle;
  if (institution && !identifierIn(identity, institution)) {
    if (!registered || !(dedicatedPage || identifierIn(window, institution)))
      return false;
    borrowed = true;
  }
  if (notice.edition && !identifierIn(identity, normalize(notice.edition))) {
    const edition = normalize(notice.edition);
    if (
      !registered ||
      !(identifierIn(window, edition) || identifierIn(sourceTitle, edition))
    )
      return false;
    borrowed = true;
  }
  if (borrowed && contextConflicts(notice, institution, window)) return false;
  // A generic page label can add no identity evidence. A specific, different
  // heading must not be overridden by an unrelated matching paragraph below it.
  const genericTitle = sourceTitle
    .replace(normalize(notice.institution) || "\0", "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(
      /(?<![\p{L}\p{N}])(?:official|notices?|updates?|amendments?|cancellations?|workshops?|events?|announcements?|pages?|home|news|calendar|list|category|categories|programmes?|programs?|actualités|événements|agenda|accueil|avis|noticias|eventos|inicio|aviso|veranstaltungen|nachrichten|startseite|termine|novidades|início|мероприятия|новости|главная)(?![\p{L}\p{N}])/gu,
      "",
    )
    .replace(
      /공지사항|공지|새소식|행사안내|행사|홈|목록|お知らせ|イベント|ニュース|一覧|ホーム|通知|公告|活动|首頁|首页|الأخبار|الفعاليات|الرئيسية/gu,
      "",
    )
    .replace(/[\s:·.,!()|/—–-]/g, "");
  if (genericTitle && !identifierIn(sourceTitle, title)) return false;
  // A specific heading segment names the event, not just a bag of keywords.
  // "History" must not match "Local History | Library". Generic site labels
  // above remain neutral and cannot provide this identity evidence themselves.
  if (genericTitle && !headingParts.includes(title)) return false;
  if (
    genericTitle &&
    headingParts.some(
      (part) =>
        part !== title &&
        part !== institution &&
        !/^(?:(?:19|20)\d{2}\s+)?(?:updates?|amendments?|notices?|수정 안내|synthetic example|합성 예시)$/u.test(
          part,
        ),
    )
  )
    return false;

  const expected = editionMarkers(`${notice.title} ${notice.edition || ""}`);
  for (const text of [quote, source.title]) {
    for (const [kind, values] of editionMarkers(text)) {
      const wanted = expected.get(kind);
      if (wanted && [...values].some((value) => !wanted.has(value)))
        return false;
    }
  }
  return true;
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
): { fields: FieldComparison[]; identity: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const identity =
    model.same_notice &&
    sameIdentity(notice, source, model.identity_quote) &&
    exactExcerpt(source.text, model.identity_quote) &&
    (!notice.country ||
      !model.country ||
      notice.country.toUpperCase() === model.country.toUpperCase());
  if (!identity) warnings.push("identity");
  if (source.authority === "unverified") warnings.push("authority");
  const cancellation = cancellationEvidence(notice, source.text);
  const cancellationConcern =
    model.source_role === "cancellation" || cancellationWord.test(source.text);
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
    const verified =
      quoteSupported &&
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
  return { fields, identity, warnings: [...new Set(warnings)] };
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
}): Result {
  const { notice, sources, analyses } = args;
  const comparisons: FieldComparison[] = [];
  const warnings = [...(args.warnings || [])];
  let identityFailed = false;
  analyses.forEach((m, i) => {
    if (!sources[i]) return;
    const verified = verifyComparison(notice, sources[i], m);
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
