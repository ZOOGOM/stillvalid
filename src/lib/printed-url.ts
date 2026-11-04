// Finds a web address printed on a notice so the user does not have to type
// it. It is only a suggestion shown in the editable link field: the check still
// decides on its own whether the page is an official source, so a printed
// address can never make a result "verified" by itself.

// Social, blog, messenger and link-shortener hosts are never offered: they are
// not the issuer's own notice page, and a direct link would skip the search for
// one.
const notOfficial =
  /(?:^|\.)(?:instagram\.com|facebook\.com|fb\.me|youtube\.com|youtu\.be|x\.com|twitter\.com|tiktok\.com|threads\.net|linkedin\.com|blog\.naver\.com|cafe\.naver\.com|naver\.me|tistory\.com|brunch\.co\.kr|blogspot\.com|wordpress\.com|medium\.com|kakao\.com|pf\.kakao\.com|open\.kakao\.com|band\.us|linktr\.ee|bit\.ly|t\.co|goo\.gl|forms\.gle|docs\.google\.com|line\.me|wa\.me|weibo\.com|qq\.com|note\.com|ameblo\.jp)$/i;

// Hosts that look like a public body's own site rank first.
const publicBody =
  /(?:^|\.)(?:go\.kr|gov|gov\.[a-z]{2}|gouv\.[a-z]{2}|gob\.[a-z]{2}|govt\.[a-z]{2}|admin\.ch|bund\.de|go\.jp|lg\.jp|gov\.cn|mil|edu|ac\.[a-z]{2})$/i;

// Bare host names (no "http" or "www") are only accepted with one of these
// endings, so file names such as "form.pdf" are not mistaken for sites.
const bareEndings =
  "go\\.kr|or\\.kr|ac\\.kr|re\\.kr|co\\.kr|kr|gov(?:\\.[a-z]{2})?|gouv\\.[a-z]{2}|gob\\.[a-z]{2}|edu|org|com|net|uk|jp|cn|de|fr|es|it|pt|br|ru|ch|nl|au|ca|us|info";
const candidates = new RegExp(
  "(?:https?://|www\\.)[^\\s<>\"'()\\[\\]{}|\\u3000-\\u303f\\uff08\\uff09\\uff0c\\uff1a]+" +
    "|(?<![@\\w.-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:" +
    bareEndings +
    ")(?![\\w-])(?:/[^\\s<>\"'()\\[\\]{}|\\u3000-\\u303f\\uff08\\uff09\\uff0c\\uff1a]*)?",
  "gi",
);

function normalise(raw: string): URL | null {
  // Sentence punctuation that follows an address is not part of it.
  const trimmed = raw.replace(/[.,;:!?'"’”»›。、，．]+$/u, "");
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/^http:/i, "https:")
    : "https://" + trimmed;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (
    !host.includes(".") ||
    url.username ||
    url.password ||
    url.port ||
    withScheme.length > 2000 ||
    /^\d+(?:\.\d+)+$/.test(host) ||
    notOfficial.test(host)
  )
    return null;
  url.hash = "";
  return url;
}

/**
 * A public body's address printed in the notice text, or null. Only such
 * addresses that point at a page (not a bare home page) are offered: filling
 * the field skips the search, and other printed
 * https links are already tried alongside the search results on the server.
 */
export function printedUrl(text: string): string | null {
  const found: URL[] = [];
  for (const match of text.matchAll(candidates)) {
    const url = normalise(match[0]);
    if (url && !found.some((u) => u.href === url.href)) found.push(url);
  }
  // A bare home page is not the notice itself; the search does better there.
  return (
    found.find(
      (u) =>
        publicBody.test(u.hostname) &&
        (u.pathname.replace(/\/+$/, "") !== "" || u.search !== ""),
    )?.href ?? null
  );
}
