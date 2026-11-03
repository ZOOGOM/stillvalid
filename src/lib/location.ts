import { iso1A2Code } from "@rapideditor/country-coder";
import { isCountry } from "./countries";

const EARTH_RADIUS_METRES = 6_371_000;
const MIN_GUARD_METRES = 1_000;
const MAX_ACCURACY_METRES = 20_000;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Approximate local lookup only. The source data uses simplified, de facto
 * borders and does not establish legal boundaries; sample agreement cannot
 * prove that the whole uncertainty area lies within a country.
 */
export function countryFromPosition(
  latitude: number,
  longitude: number,
  accuracy: number,
): string | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    accuracy < 0 ||
    accuracy > MAX_ACCURACY_METRES
  ) {
    return null;
  }

  const country = iso1A2Code([longitude, latitude], { level: "territory" });
  if (!country || !isCountry(country)) return null;

  // A minimum guard also accounts for some imprecision in the border data.
  // Eight bearings are a conservative check, not a polygon intersection test.
  const distance = Math.max(accuracy, MIN_GUARD_METRES) / EARTH_RADIUS_METRES;
  const lat = radians(latitude);
  const lon = radians(longitude);
  for (let i = 0; i < 8; i++) {
    const bearing = (i * Math.PI) / 4;
    const sampleLat = Math.asin(
      Math.max(
        -1,
        Math.min(
          1,
          Math.sin(lat) * Math.cos(distance) +
            Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
        ),
      ),
    );
    const sampleLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
        Math.cos(distance) - Math.sin(lat) * Math.sin(sampleLat),
      );
    const wrappedLon = ((degrees(sampleLon) + 540) % 360) - 180;
    if (
      iso1A2Code([wrappedLon, degrees(sampleLat)], { level: "territory" }) !==
      country
    ) {
      return null;
    }
  }
  return country;
}
