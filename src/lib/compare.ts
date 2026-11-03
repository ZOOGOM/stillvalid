import {
  containsQuote,
  normalize,
  type FieldComparison,
  type Lang,
  type ModelComparison,
  type Notice,
  type Result,
  type Source,
} from "./schema";

export function verifyComparison(
  notice: Notice,
  source: Source,
  model: ModelComparison,
): { fields: FieldComparison[]; identity: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const expectedYears: string[] =
    (notice.edition || notice.title).match(/\b(?:19|20)\d{2}\b/g) || [];
  const identityYears: string[] =
    model.identity_quote.match(/\b(?:19|20)\d{2}\b/g) || [];
  const editionMatches =
    !expectedYears.length ||
    (expectedYears.every((year) => identityYears.includes(year)) &&
      identityYears.every((year) => expectedYears.includes(year)));
  const identity =
    model.same_notice &&
    editionMatches &&
    containsQuote(source.text, model.identity_quote) &&
    (!notice.country ||
      !model.country ||
      notice.country.toUpperCase() === model.country.toUpperCase());
  if (!identity) warnings.push("identity");
  if (source.authority === "unverified") warnings.push("authority");
  const fields = model.comparisons.map((f): FieldComparison => {
    const original = notice.fields.find(
      (x) =>
        x.key === f.key &&
        f.before !== null &&
        normalize(x.value) === normalize(f.before),
    );
    const quoteSupported =
      identity &&
      source.authority === "registered" &&
      model.source_role !== "unknown" &&
      !!original &&
      containsQuote(notice.originalText, f.before_quote) &&
      containsQuote(f.before_quote || "", f.before) &&
      containsQuote(source.text, f.after_quote) &&
      containsQuote(f.after_quote || "", f.after);
    const ambiguousRelation =
      f.relation === "unclear" ||
      (f.relation === "same" &&
        normalize(f.before || "") !== normalize(f.after || ""));
    const negatedCancellation =
      f.key === "status" &&
      /cancelled|canceled|취소/iu.test(f.after || "") &&
      /\b(?:not|never|isn't|no longer)\b.{0,35}\bcancell?ed\b|취소.{0,20}(?:아니|않|없)|취소하지/iu.test(
        f.after_quote || "",
      );
    const ambiguousDate =
      ["deadline", "date"].includes(f.key) &&
      [f.before, f.after].some((value) => {
        const match = /^(\d{1,2})[\/.](\d{1,2})(?:[\/.]\d{2,4})?$/.exec(
          value || "",
        );
        return !!match && Number(match[1]) <= 12 && Number(match[2]) <= 12;
      });
    const verified =
      quoteSupported &&
      !ambiguousRelation &&
      !negatedCancellation &&
      !ambiguousDate;
    const relation =
      !verified || f.before === null || f.after === null
        ? "unclear"
        : normalize(f.before) === normalize(f.after)
          ? "same"
          : "changed";
    if (!verified) warnings.push("evidence");
    return {
      key: f.key,
      before: f.before,
      after: f.after,
      beforeQuote: f.before_quote,
      afterQuote: f.after_quote,
      sourceId: source.id,
      relation,
      verified,
    };
  });
  return { fields, identity, warnings: [...new Set(warnings)] };
}

export function assembleResult(args: {
  id: string;
  notice: Notice;
  sources: Source[];
  analyses: ModelComparison[];
  lang: Lang;
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
  const cancelled = analyses.some(
    (a, i) =>
      a.source_role === "cancellation" &&
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
        warnings.includes("conflict")
      ? "review"
      : cancelled
        ? "cancelled"
        : expired
          ? "expired"
          : verified.some((f) => f.relation === "changed")
            ? "changed"
            : "matched";
  if (notice.fields.some((f) => !verified.some((v) => v.key === f.key)))
    warnings.push("partial");
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
