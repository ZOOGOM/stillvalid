import { assembleResult } from "./compare";
import type { Lang, ModelComparison, Notice, Result, Source } from "./schema";

export const demoIds = ["deadline", "cancelled", "identity"] as const;
export type DemoId = (typeof demoIds)[number];
export function demoResult(id: DemoId, lang: Lang): Result {
  const ko = lang === "ko";
  const notice: Notice = {
    title: ko
      ? "동네 도서관의 가을 책 모임"
      : "Autumn reading at the neighbourhood library",
    institution: ko ? "예시 마을도서관" : "Example Community Library",
    edition: "2026",
    country: "KR",
    originalText: ko
      ? "예시 마을도서관 · 동네 도서관의 가을 책 모임 · 2026\n신청 마감: 2026년 11월 4일\n장소: 1층 커뮤니티실\n상태: 접수 중"
      : "Example Community Library · Autumn reading at the neighbourhood library · 2026\nApply by: 4 November 2026\nLocation: Ground floor community room\nStatus: Open",
    fields: [
      {
        key: "deadline",
        value: ko ? "2026년 11월 4일" : "4 November 2026",
        quote: ko ? "신청 마감: 2026년 11월 4일" : "Apply by: 4 November 2026",
      },
      {
        key: "location",
        value: ko ? "1층 커뮤니티실" : "Ground floor community room",
        quote: ko
          ? "장소: 1층 커뮤니티실"
          : "Location: Ground floor community room",
      },
      {
        key: "status",
        value: ko ? "접수 중" : "Open",
        quote: ko ? "상태: 접수 중" : "Status: Open",
      },
    ],
  };
  const identityQuote = ko
    ? "예시 마을도서관 · 동네 도서관의 가을 책 모임 · 2026"
    : "Example Community Library · Autumn reading at the neighbourhood library · 2026";
  const afterDeadline = ko ? "2026년 11월 10일" : "10 November 2026";
  const afterRoom = ko ? "2층 세미나실" : "Second floor seminar room";
  const afterStatus =
    id === "cancelled" ? (ko ? "취소" : "Cancelled") : ko ? "접수 중" : "Open";
  const source: Source = {
    id: "demo-source",
    url: "https://example.org/synthetic/library-notice",
    title: ko
      ? "2026 책 모임 수정 안내 · 합성 예시"
      : "2026 reading group update · synthetic example",
    text: `${identityQuote}\n${ko ? "신청 마감" : "Apply by"}: ${afterDeadline}\n${ko ? "장소" : "Location"}: ${afterRoom}\n${ko ? "상태" : "Status"}: ${afterStatus}`,
    authority: "registered",
    fetchedAt: "2026-11-03T00:00:00.000Z",
    institution: notice.institution,
  };
  if (id === "identity") source.text = source.text.replace(/2026/g, "2027");
  const analysis: ModelComparison = {
    same_notice: id !== "identity",
    identity_quote:
      id === "identity" ? identityQuote.replace("2026", "2027") : identityQuote,
    country: "KR",
    source_role: id === "cancelled" ? "cancellation" : "amendment",
    summary: "",
    next_action: "",
    comparisons: notice.fields.map((f, i) => ({
      key: f.key,
      before: f.value,
      after: [afterDeadline, afterRoom, afterStatus][i],
      before_quote: f.quote,
      after_quote: source.text.split("\n")[i + 1],
      relation: f.key === "status" && id !== "cancelled" ? "same" : "changed",
    })),
  };
  return assembleResult({
    id: "demo-" + id,
    notice,
    sources: [source],
    analyses: [analysis],
    lang,
    mode: "demo",
    checkedAt: "2026-11-03T00:00:00.000Z",
  });
}
