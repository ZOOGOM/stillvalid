import { createHash } from "node:crypto";
import { authorityFor } from "./source";
import { sourceRelevant } from "./relevance";
import type { Candidate, Notice, Source } from "./schema";

export function rankCandidates(
  candidates: Candidate[],
  notice: Notice,
): Candidate[] {
  const official = (candidate: Candidate) => {
    const url = new URL(candidate.url);
    return Number(
      authorityFor(url.hostname, url.pathname + url.search).authority ===
        "registered",
    );
  };
  return [...candidates].sort(
    (a, b) =>
      official(b) - official(a) ||
      Number(sourceRelevant(notice, { title: b.title, text: "" })) -
        Number(sourceRelevant(notice, { title: a.title, text: "" })),
  );
}

// Exact model inputs and trust must match. Similar text on another URL is not
// sufficient: the other page may establish a different issuer or edition.
export function sourceEvidenceKey(source: Source): string {
  return createHash("sha256")
    .update(
      JSON.stringify([source.url, source.title, source.text, source.authority]),
    )
    .digest("hex");
}
