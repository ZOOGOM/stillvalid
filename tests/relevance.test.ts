import test from "node:test";
import assert from "node:assert/strict";
import { sourceRelevant } from "../src/lib/relevance";
import { firstInOrder, settle } from "../src/lib/priority";
import { abuseSecret } from "../src/lib/abuse";

const nasm = {
  title: "Research Fellowships",
  institution: "National Air and Space Museum",
  fields: [
    {
      key: "deadline" as const,
      value: "December 11, 2026",
      quote: "Applications Due: December 11, 2026",
    },
  ],
};
const korean = {
  title: "가을 독서 모임 참가자 모집",
  institution: "마포구립도서관",
  fields: [
    {
      key: "location" as const,
      value: "2층 세미나실",
      quote: "장소: 2층 세미나실",
    },
  ],
};

test("related pages are always compared, even with a different title wording", () => {
  // Real page: "Fellowships | National Air and Space Museum" without the notice title.
  assert.equal(
    sourceRelevant(nasm, {
      title: "Fellowships | National Air and Space Museum",
      text: "Applications Due December 18, 2026",
    }),
    true,
  );
  // Only a distinctive title word in common still counts as related.
  assert.equal(
    sourceRelevant(
      { ...nasm, institution: "" },
      { title: "Smithsonian", text: "Fellowship opportunities" },
    ),
    false,
  );
  assert.equal(
    sourceRelevant(
      { ...nasm, institution: "" },
      { title: "Smithsonian", text: "Research fellowships and grants" },
    ),
    true,
  );
  // An unchanged field value alone keeps the page in comparison.
  assert.equal(
    sourceRelevant(
      { ...korean, title: "x", institution: "" },
      { title: "도서관", text: "장소: 2층 세미나실" },
    ),
    true,
  );
  // Korean words match inside compound spacing variants.
  assert.equal(
    sourceRelevant(
      { ...korean, institution: "" },
      { title: "마포구", text: "독서모임 회원을 찾습니다" },
    ),
    true,
  );
});

test("pages sharing nothing with the notice are skipped", () => {
  assert.equal(
    sourceRelevant(korean, {
      title: "Fellowships | National Air and Space Museum",
      text: "Applications Due December 18, 2026",
    }),
    false,
  );
  // Common notice words alone (모집, 안내, 신청, seasons) do not make a portal related.
  assert.equal(
    sourceRelevant(korean, {
      title: "삶의 질 특별시 서울 | 서울특별시",
      text: "공지사항 모집 안내 신청 접수 가을 행사 일정",
    }),
    false,
  );
  assert.equal(
    sourceRelevant(nasm, {
      title: "Home",
      text: "Official notices, events, updates and applications.",
    }),
    false,
  );
});

test("concurrent fetches are decided in priority order like a sequential loop", async () => {
  const delayed = <T>(ms: number, value: T, fail = false) =>
    settle(
      new Promise<T>((resolve, reject) =>
        setTimeout(
          () => (fail ? reject(new Error(String(value))) : resolve(value)),
          ms,
        ),
      ),
    );
  // The third finishes first but must not displace earlier successes.
  let r = await firstInOrder(
    [delayed(30, "a"), delayed(20, "b"), delayed(1, "c")],
    2,
  );
  assert.deepEqual(r.values, ["a", "b"]);
  assert.equal(r.errors.length, 0);
  // A failure before the kept successes is reported; one after is not.
  r = await firstInOrder(
    [
      delayed(5, "x", true),
      delayed(10, "a"),
      delayed(15, "b"),
      delayed(1, "y", true),
    ],
    2,
  );
  assert.deepEqual(r.values, ["a", "b"]);
  assert.equal(r.errors.length, 1);
  // Fewer successes than the limit reports every failure.
  r = await firstInOrder(
    [delayed(1, "x", true), delayed(2, "a"), delayed(3, "y", true)],
    2,
  );
  assert.deepEqual(r.values, ["a"]);
  assert.equal(r.errors.length, 2);
  // Stopping early never awaits a slow trailing operation.
  const started = Date.now();
  r = await firstInOrder(
    [delayed(1, "a"), delayed(1, "b"), delayed(5000, "slow")],
    2,
  );
  assert.ok(Date.now() - started < 1000);
});

test("network-limit key: dedicated secret, derived fallback, or disabled", () => {
  const dedicated = "s".repeat(32);
  assert.equal(
    abuseSecret({ IP_RATE_LIMIT_SECRET: dedicated, META_API_KEY: "k" }),
    dedicated,
  );
  const derived = abuseSecret({ META_API_KEY: "test-only-key" });
  assert.match(derived || "", /^[a-f0-9]{64}$/);
  assert.notEqual(derived, "test-only-key");
  assert.equal(abuseSecret({ MODEL_API_KEY: "test-only-key" }), derived);
  // A too-short dedicated secret is ignored in favour of the derived key.
  assert.equal(
    abuseSecret({
      IP_RATE_LIMIT_SECRET: "short",
      META_API_KEY: "test-only-key",
    }),
    derived,
  );
  assert.notEqual(abuseSecret({ META_API_KEY: "another-key" }), derived);
  assert.equal(abuseSecret({}), undefined);
});
