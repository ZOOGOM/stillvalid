import { normalize, type Notice, type Source } from "./schema";

// Words that appear on almost any notice or portal page. They are never
// enough, on their own, to call a fetched page related to a notice.
const commonWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "your",
  "notice",
  "notices",
  "program",
  "programs",
  "programme",
  "programmes",
  "event",
  "events",
  "update",
  "updates",
  "announcement",
  "announcements",
  "information",
  "official",
  "apply",
  "application",
  "applications",
  "registration",
  "deadline",
  "open",
  "free",
  "모집",
  "안내",
  "공고",
  "공지",
  "공지사항",
  "신청",
  "참가",
  "참가자",
  "참여",
  "행사",
  "교육",
  "프로그램",
  "접수",
  "일정",
  "대상",
  "봄",
  "여름",
  "가을",
  "겨울",
]);

const cjk =
  /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

function distinctiveTokens(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(
      (token) =>
        !commonWords.has(token) &&
        !/^\d+$/.test(token) &&
        (cjk.test(token) ? token.length >= 2 : token.length >= 4),
    );
}

/**
 * A deliberately lenient pre-check before spending a model comparison.
 *
 * Identity verification requires the complete notice title inside an exact
 * source quote, so a page sharing nothing with the notice can never produce a
 * verified field. This check only skips pages with no institution, title,
 * distinctive title word or field value in common; anything plausibly related
 * is still compared, so unverified before/after hints remain available.
 */
export function sourceRelevant(
  notice: Pick<Notice, "title" | "institution" | "fields">,
  source: Pick<Source, "title" | "text">,
): boolean {
  const haystack = normalize(`${source.title}\n${source.text}`);
  const contains = (value: string | null | undefined) => {
    const needle = normalize(value || "");
    return needle.length >= 2 && haystack.includes(needle);
  };
  if (contains(notice.institution) || contains(notice.title)) return true;
  if (
    notice.fields.some(
      (field) => normalize(field.value).length >= 4 && contains(field.value),
    )
  )
    return true;
  return distinctiveTokens(notice.title).some((token) =>
    haystack.includes(token),
  );
}
