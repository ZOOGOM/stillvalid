import test from "node:test";
import assert from "node:assert/strict";
import { abuseKey } from "../src/lib/abuse";
const config = {
  vercel: "1",
  secret: "test-only-secret-not-for-production-000",
};
const key = (ip?: string) =>
  abuseKey(new Headers(ip ? { "x-vercel-forwarded-for": ip } : {}), config);
test("network protection requires Vercel and a dedicated sufficiently long secret", () => {
  assert.equal(abuseKey(new Headers(), {}), undefined);
  assert.equal(abuseKey(new Headers(), { ...config, vercel: "0" }), undefined);
  assert.equal(
    abuseKey(new Headers(), { ...config, secret: "short" }),
    undefined,
  );
});
test("trusted IP normalization groups IPv6 /64 and mapped IPv4", () => {
  assert.equal(key("192.0.2.1"), key("::ffff:192.0.2.1"));
  assert.equal(key("2001:db8:0:1::1"), key("2001:0db8:0000:0001:abcd::2"));
  assert.notEqual(key("2001:db8:0:1::1"), key("2001:db8:0:2::1"));
});
test("missing and malformed trusted headers use one bounded unknown bucket", () => {
  for (const raw of ["bad", "192.0.2.1, 192.0.2.2", "127.1", "fe80::1%eth0"])
    assert.equal(key(raw), key());
  assert.equal(
    abuseKey(
      new Headers({ "x-forwarded-for": "192.0.2.1", "x-real-ip": "192.0.2.2" }),
      config,
    ),
    key(),
  );
});
test("HMAC identity remains stable across time boundaries but changes with the secret", (t) => {
  const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1" });
  assert.match(key("192.0.2.1")!, /^[a-f0-9]{64}$/);
  const initial = abuseKey(headers, config);
  for (const now of [3599999, 3600000, 7200000, 86400000]) {
    t.mock.method(Date, "now", () => now);
    assert.equal(abuseKey(headers, config), initial);
  }
  assert.notEqual(
    abuseKey(headers, { ...config, secret: config.secret + "x" }),
    key("192.0.2.1"),
  );
});
