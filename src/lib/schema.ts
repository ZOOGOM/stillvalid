import { z } from "zod";
import { isCountry } from "./countries";
import { resultLanguages, type ResultLang } from "./languages";

const countrySchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/)
  .refine(isCountry)
  .nullable();

export const fieldKeys = [
  "deadline",
  "date",
  "location",
  "status",
  "cost",
  "eligibility",
] as const;
export const fieldSchema = z.object({
  key: z.enum(fieldKeys),
  value: z.string().min(1).max(500),
  quote: z.string().min(1).max(1500),
});
export const noticeSchema = z.object({
  title: z.string().min(1).max(300),
  institution: z.string().max(300),
  edition: z.string().max(100).nullable(),
  country: countrySchema,
  originalText: z.string().min(1).max(18000),
  fields: z.array(fieldSchema).max(12),
});
// Provider-only classification permits an empty transcription for non-documents;
// successful extraction still has to satisfy noticeSchema before returning.
export const imageExtractionSchema = noticeSchema.extend({
  content_kind: z.enum(["notice", "not_notice", "uncertain"]),
  title: z.string().max(300),
  originalText: z.string().max(18000),
});
export const checkRequestSchema = z.object({
  notice: noticeSchema,
  country: z.string().refine(isCountry).nullable(),
  lang: z.enum(resultLanguages),
  sourceUrl: z.string().max(2000).default(""),
  requestKey: z.string().uuid(),
});
export const comparisonSchema = z.object({
  same_notice: z.boolean(),
  identity_quote: z.string().max(2000),
  country: countrySchema,
  source_role: z.enum(["original", "amendment", "cancellation", "unknown"]),
  comparisons: z
    .array(
      z.object({
        key: z.enum(fieldKeys),
        before: z.string().max(500).nullable(),
        after: z.string().max(500).nullable(),
        before_quote: z.string().max(1500).nullable(),
        after_quote: z.string().max(1500).nullable(),
        relation: z.enum(["changed", "same", "unclear"]),
      }),
    )
    .max(12),
  summary: z.string().max(1200),
  next_action: z.string().max(1200),
});
export type Notice = z.infer<typeof noticeSchema>;
export type ModelComparison = z.infer<typeof comparisonSchema>;
export type Lang = ResultLang;
export type ResultStatus =
  "changed" | "matched" | "cancelled" | "expired" | "review" | "unavailable";
export type Source = {
  id: string;
  url: string;
  title: string;
  text: string;
  fetchedAt: string;
  authority: "registered" | "unverified";
  institution?: string;
};
export type Candidate = { url: string; title: string };
export type FieldComparison = {
  key: (typeof fieldKeys)[number];
  before: string | null;
  after: string | null;
  beforeQuote: string | null;
  afterQuote: string | null;
  sourceId: string;
  relation: "changed" | "same" | "unclear";
  verified: boolean;
};
export type Result = {
  id: string;
  mode: "live" | "demo";
  status: ResultStatus;
  title: string;
  institution: string;
  country: string | null;
  checkedAt: string;
  expiresAt: string | null;
  comparisons: FieldComparison[];
  sources: Omit<Source, "text">[];
  candidates: Candidate[];
  warnings: string[];
  lang: ResultLang;
  elapsedMs: number;
};

export function normalize(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}
export function containsQuote(
  text: string,
  quote: string | null | undefined,
): boolean {
  return !!quote?.trim() && normalize(text).includes(normalize(quote));
}
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
