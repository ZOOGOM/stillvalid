import test from "node:test";
import assert from "node:assert/strict";
import { countryFromPosition } from "../src/lib/location";

test("looks up countries and territories from latitude and longitude", () => {
  const examples: [number, number, string][] = [
    [37.5665, 126.978, "KR"],
    [35.6812, 139.7671, "JP"],
    [40.7484, -73.9857, "US"],
    [51.5074, -0.1278, "GB"],
    [1.3521, 103.8198, "SG"],
    [22.3193, 114.1694, "HK"],
  ];
  for (const [latitude, longitude, expected] of examples) {
    assert.equal(countryFromPosition(latitude, longitude, 20), expected);
  }
});

test("rejects invalid coordinates and accuracy, including the accuracy limit", () => {
  for (const [latitude, longitude, accuracy] of [
    [NaN, 126.978, 20],
    [Infinity, 126.978, 20],
    [37.5665, -Infinity, 20],
    [91, 126.978, 20],
    [-91, 126.978, 20],
    [37.5665, 181, 20],
    [37.5665, -181, 20],
    [37.5665, 126.978, -1],
    [37.5665, 126.978, NaN],
    [37.5665, 126.978, Infinity],
    [37.5665, 126.978, 20_001],
  ]) {
    assert.equal(countryFromPosition(latitude, longitude, accuracy), null);
  }
  assert.equal(countryFromPosition(37.5665, 126.978, 20_000), "KR");
});

test("returns no choice for open ocean or an uncertain border area", () => {
  assert.equal(countryFromPosition(0, -140, 20), null);
  // Kosovo is coded as XK by the library but is outside the app's ISO list.
  assert.equal(countryFromPosition(42.6629, 21.1655, 20), null);
  // Niagara Falls lies by the US–Canada border; even a reported zero error
  // uses the minimum guard radius around the coordinate.
  assert.equal(countryFromPosition(43.0896, -79.0706, 0), null);
});

test("samples across the international date line without changing hemispheres", () => {
  assert.equal(countryFromPosition(-16.15, 179.99, 2_000), "FJ");
  assert.equal(countryFromPosition(-16.15, -179.99, 2_000), "FJ");
});
