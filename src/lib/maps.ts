// Google Maps URLs (https://developers.google.com/maps/documentation/urls):
// a plain search link, no API key, no SDK and no request until the user opens
// it. The query is the displayed place text with only leading and trailing
// whitespace removed: nothing is translated, normalized, summarised or added.
const searchBase = "https://www.google.com/maps/search/";
export const mapsUrlLimit = 2048;

export function googleMapsSearchUrl(
  place: string | null | undefined,
): string | null {
  if (typeof place !== "string") return null;
  const query = place.trim();
  // Empty values and display placeholders ("—", "-", "…") have no letters or
  // digits to search for.
  if (!query || !/[\p{L}\p{N}]/u.test(query)) return null;
  const url = new URL(searchBase);
  url.search = new URLSearchParams({ api: "1", query }).toString();
  const href = url.href;
  // Never cut a long place name short; omit the link instead.
  return href.length > mapsUrlLimit ? null : href;
}
