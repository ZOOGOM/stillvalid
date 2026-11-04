import test from "node:test";
import assert from "node:assert/strict";
import {
  abortable,
  evidenceKey,
  ReadingCache,
} from "../src/lib/request-efficiency";
import { candidatesFromResponse } from "../src/lib/meta";
import { rankCandidates, sourceEvidenceKey } from "../src/lib/source-planning";
import { prefetchEligible } from "../src/lib/priority";
import type { Notice, Source } from "../src/lib/schema";
const notice: Notice = {
  title: "Unique Fellowship",
  institution: "Smithsonian",
  edition: "2026",
  country: "US",
  originalText: "Unique Fellowship 2026",
  fields: [],
};
test("late official citations survive collection and precede the three-candidate cap", () => {
  const candidates = candidatesFromResponse({
    output: [
      {
        type: "web_search_call",
        results: [1, 2, 3].map((i) => ({
          url: `https://news${i}.com/page`,
          title: "Other news",
        })),
      },
      {
        type: "message",
        content: [
          {
            annotations: [
              {
                type: "url_citation",
                url: "https://si.edu/fellowship",
                title: "Unique Fellowship",
              },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(candidates.length, 4);
  assert.equal(
    rankCandidates(candidates, notice).slice(0, 3)[0].url,
    "https://si.edu/fellowship",
  );
  assert.equal(
    rankCandidates(
      [
        { url: "https://seoul.go.kr/?freeboard=x", title: "Other" },
        { url: "https://news.com/page", title: notice.title },
      ],
      notice,
    )[0].url,
    "https://news.com/page",
  );
});
test("one reading is cloned, invalidated by input, expires, and clears", () => {
  const cache = new ReadingCache<Notice>();
  cache.set("image+country", notice, 100);
  const reading = cache.get("image+country", 101)!;
  reading.title = "Edited";
  assert.equal(cache.get("image+country", 102)?.title, notice.title);
  assert.equal(cache.get("different-country", 102), undefined);
  assert.equal(cache.get("image+country", 600100), undefined);
  cache.set("new-image", notice);
  cache.clear();
  assert.equal(cache.get("new-image"), undefined);
});
test("evidence reuse ignores display language but not edits, region or URL", () => {
  const key = evidenceKey(notice, "US", "https://si.edu/page");
  assert.notEqual(
    key,
    evidenceKey({ ...notice, edition: "2027" }, "US", "https://si.edu/page"),
  );
  assert.notEqual(key, evidenceKey(notice, "KR", "https://si.edu/page"));
  assert.notEqual(key, evidenceKey(notice, "US", "https://si.edu/other"));
});
test("a stalled DNS-like task obeys cancellation without waiting for completion", async () => {
  const c = new AbortController();
  const reason = new DOMException("timeout", "TimeoutError");
  const pending = abortable(new Promise(() => {}), c.signal);
  c.abort(reason);
  await assert.rejects(pending, (e) => e === reason);
  await assert.rejects(
    abortable(Promise.resolve(1), c.signal),
    (e) => e === reason,
  );
});
test("a ready second source starts comparison while the first stalls; third stays lazy", async () => {
  let release!: (value: string) => void;
  const started: string[] = [];
  const loads = prefetchEligible(
    [
      new Promise<string>((r) => (release = r)),
      Promise.resolve("second"),
      Promise.resolve("third"),
    ],
    () => true,
    (v) => started.push(v),
  );
  await loads[1];
  await loads[2];
  assert.deepEqual(started, ["second"]);
  release("first");
  await loads[0];
  assert.deepEqual(started, ["second", "first"]);
});
test("only identical redirected evidence shares a comparison, never changed content or trust", () => {
  const source: Source = {
    id: "a",
    title: "Notice",
    text: "Open",
    url: "https://si.edu/page",
    authority: "registered",
    fetchedAt: "2026-11-04",
  };
  assert.equal(
    sourceEvidenceKey(source),
    sourceEvidenceKey({ ...source, id: "b", fetchedAt: "later" }),
  );
  for (const change of [
    { text: "Cancelled" },
    { authority: "unverified" as const },
    { url: "https://other.com/page" },
  ])
    assert.notEqual(
      sourceEvidenceKey(source),
      sourceEvidenceKey({ ...source, ...change }),
    );
});
