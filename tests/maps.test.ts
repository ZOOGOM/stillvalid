import test from "node:test";
import assert from "node:assert/strict";
import { googleMapsSearchUrl, mapsUrlLimit } from "../src/lib/maps";

test("map search links carry the displayed place text exactly", () => {
  for (const place of [
    "수산제역사공원 일원",
    "  1층 커뮤니티실  ",
    "British Museum, Great Russell St",
    "Hall A & B",
    "Room #4",
    "Main Library (2nd floor)",
    "C++ Lab + Annex",
    "100% Hall",
    "Garden 🌱 Pavilion",
    "مكتبة الإسكندرية",
    "Café Ünïcode",
    "東京都 千代田区",
  ]) {
    const href = googleMapsSearchUrl(place);
    assert.ok(href, place);
    const url = new URL(href!);
    assert.equal(
      url.origin + url.pathname,
      "https://www.google.com/maps/search/",
    );
    assert.equal(url.searchParams.get("api"), "1");
    assert.equal(url.searchParams.get("query"), place.trim());
    assert.deepEqual([...url.searchParams.keys()], ["api", "query"]);
  }
});

test("no link for missing, placeholder or overlong place values", () => {
  for (const value of [
    null,
    undefined,
    "",
    "   ",
    "\n\t",
    "—",
    "-",
    "…",
    "--",
    "·",
  ])
    assert.equal(googleMapsSearchUrl(value), null, String(value));
  // A link is omitted rather than built from a truncated place name.
  const long = "가".repeat(400);
  assert.ok(
    new URL(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(long),
    ).href.length > mapsUrlLimit,
  );
  assert.equal(googleMapsSearchUrl(long), null);
  const fits = "a".repeat(1900);
  assert.ok(googleMapsSearchUrl(fits));
  assert.ok(googleMapsSearchUrl(fits)!.length <= mapsUrlLimit);
});
