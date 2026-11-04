import { lookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { Agent, fetch as request } from "undici";
import ipaddr from "ipaddr.js";
import * as cheerio from "cheerio";
import { AppError, type Source } from "./schema";

export function isPublicAddress(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address);
    if (
      parsed.kind() === "ipv6" &&
      (parsed as ipaddr.IPv6).isIPv4MappedAddress()
    )
      parsed = (parsed as ipaddr.IPv6).toIPv4Address();
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}
export function publicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("source_url");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    value.length > 2000 ||
    !host.includes(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion|arpa)$/.test(
      host,
    ) ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new AppError("source_url");
  url.hash = "";
  return url;
}
const registeredHosts: Record<string, string> = {
  "seoul.go.kr": "Seoul Metropolitan Government",
  "gov.kr": "Government of Korea",
  "gov.uk": "UK Government",
  "nyc.gov": "City of New York",
  "usa.gov": "US Government",
  "loc.gov": "Library of Congress",
  "si.edu": "Smithsonian Institution",
  "nps.gov": "US National Park Service",
  "britishmuseum.org": "The British Museum",
  "bl.uk": "The British Library",
  "nypl.org": "New York Public Library",
  "sfpl.org": "San Francisco Public Library",
  "london.gov.uk": "Greater London Authority",
  "data.seoul.go.kr": "Seoul Open Data Plaza",
};
export function authorityFor(hostname: string): {
  authority: Source["authority"];
  institution?: string;
} {
  const configured = (process.env.VERIFIED_SOURCE_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const hosts = [...Object.keys(registeredHosts), ...configured];
  const match = hosts.find(
    (host) => hostname === host || hostname.endsWith("." + host),
  );
  return match
    ? { authority: "registered", institution: registeredHosts[match] || match }
    : { authority: "unverified" };
}

const cellMarker = "\u001f";

export function htmlText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,nav,footer,header,iframe,form").remove();
  const title = $("title").first().text().trim();
  $("br").replaceWith("\n");
  // Table cells and term/definition pairs keep a visible boundary, so a label
  // and its value ("장소" and "수산제역사공원 일원") are never glued into one
  // word that no exact quote or title check can separate again. The marker is
  // replaced below; no cell text is changed.
  $("th,td,dt").append(cellMarker);
  $("p,div,li,tr,h1,h2,h3,h4,h5,h6,section,dd,caption,blockquote").append("\n");
  const article =
    $("main").first().text() || $("article").first().text() || $("body").text();
  const text = article
    .replace(/[ \t]+/g, " ")
    // A cell boundary at a line end or next to another one adds nothing.
    .replace(new RegExp(`(?:\\s*${cellMarker})+\\s*(?=\\n|$)`, "g"), "")
    .replace(new RegExp(`(^|\\n)(?:\\s*${cellMarker})+\\s*`, "g"), "$1")
    .replace(new RegExp(`(?:\\s*${cellMarker})+\\s*`, "g"), " | ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
  if (text.length > 22000) throw new AppError("source_too_large", 422);
  return { title: title.slice(0, 300), text };
}

export function decodeSourceBody(
  bytes: Uint8Array,
  contentType: string,
): string {
  const prefix = Buffer.from(bytes.subarray(0, 2048)).toString("latin1");
  const declared =
    /charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i.exec(contentType)?.[1] ||
    /<meta[^>]+charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i.exec(prefix)?.[1] ||
    "utf-8";
  try {
    return new TextDecoder(declared, { fatal: true }).decode(bytes);
  } catch {
    throw new AppError("source_encoding", 422);
  }
}

// Public error codes contain no upstream bodies, addresses or TLS details.
export function sourceHttpError(status: number): AppError {
  if (status === 404 || status === 410)
    return new AppError("source_not_found", 422);
  if ([401, 403, 429].includes(status))
    return new AppError("source_blocked", 422);
  return new AppError("source_unavailable", 422);
}

export function sourceTransportError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  // Undici wraps transport failures in a TypeError with a cause.
  const outer = error as { name?: string; cause?: { code?: string } } | null;
  const code = outer?.cause?.code;
  if (
    outer?.name === "TimeoutError" ||
    (typeof code === "string" &&
      [
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT",
      ].includes(code))
  )
    return new AppError("source_timeout", 422);
  return new AppError("source_unavailable", 422);
}

export function sourceMediaType(
  contentType: string,
): "text/html" | "text/plain" {
  const type = contentType.split(";", 1)[0].trim().toLowerCase();
  if (type !== "text/html" && type !== "text/plain")
    throw new AppError("source_format", 422);
  return type;
}

export function parseSourceDocument(
  raw: string,
  contentType: string,
  url: URL,
): { title: string; text: string } {
  const type = sourceMediaType(contentType);
  // Keep actual plain-text notices supported, but never spend inference on
  // standard machine-control documents. This check does not establish relevance.
  if (
    /\/(?:robots\.txt|ads\.txt|app-ads\.txt|security\.txt|sitemap(?:[-_][^/]*)?\.xml)$/i.test(
      url.pathname,
    )
  )
    throw new AppError("source_not_notice", 422);
  const parsed =
    type === "text/html" ? htmlText(raw) : { title: url.hostname, text: raw };
  if (parsed.text.length > 22000) throw new AppError("source_too_large", 422);
  if (parsed.text.length < 40)
    // Script-only pages (soft redirects, client-rendered apps) have no
    // readable notice text; say so instead of a generic failure.
    throw new AppError(
      type === "text/html" && /<script[\s>]/i.test(raw)
        ? "source_script_only"
        : "source_unavailable",
      422,
    );
  return parsed;
}

// Official notices are often published as PDF attachments. Only the PDF's own
// text layer is used: it is extracted deterministically here, compared by the
// model as text, and every quote is still verified against this exact text. A
// scanned PDF without a text layer is reported, never OCR'd or guessed.
const pdfByteLimit = 5_000_000;
const pdfPageLimit = 20;

export async function pdfText(
  bytes: Uint8Array,
  url: URL,
): Promise<{ title: string; text: string }> {
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-")
    throw new AppError("source_format", 422);
  const { getDocumentProxy, extractText, getMeta } = await import("unpdf");
  let pages: string[];
  let title = "";
  try {
    const pdf = await getDocumentProxy(bytes, {
      // The bundled pdf.js (6.4) has no eval/Function code path; also never
      // load font faces, system fonts or XFA forms for text extraction.
      disableFontFace: true,
      enableXfa: false,
      useSystemFonts: false,
      stopAtErrors: true,
    });
    if (pdf.numPages > pdfPageLimit)
      throw new AppError("source_too_large", 422);
    pages = (await extractText(pdf, { mergePages: false })).text;
    try {
      const info = (await getMeta(pdf)).info as { Title?: unknown };
      if (typeof info.Title === "string") title = info.Title.trim();
    } catch {
      /* metadata is optional */
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Encrypted, malformed or unsupported PDFs.
    throw new AppError("source_format", 422);
  }
  const text = pages
    .map((page) =>
      page
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
  if (text.length > 22000) throw new AppError("source_too_large", 422);
  if (text.length < 40) throw new AppError("source_pdf_no_text", 422);
  const firstLine = text.split("\n").find((line) => line.trim()) || "";
  return { title: (title || firstLine || url.hostname).slice(0, 300), text };
}

export async function fetchSource(
  value: string,
  id: string,
  signal?: AbortSignal,
): Promise<Source> {
  // A generic forward proxy cannot preserve the DNS-to-connection pin below. Fail closed.
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
    throw new AppError("source_network", 503);
  let url = publicUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    let addresses: { address: string; family: number }[];
    try {
      addresses = await lookup(url.hostname, { all: true, verbatim: true });
    } catch {
      throw new AppError("source_unavailable", 422);
    }
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new AppError("source_url");
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    };
    const dispatcher = new Agent({ connect: { lookup: pinnedLookup } });
    try {
      const response = await request(url, {
        dispatcher,
        redirect: "manual",
        signal: AbortSignal.any([
          AbortSignal.timeout(12000),
          ...(signal ? [signal] : []),
        ]),
        headers: {
          "User-Agent":
            "StillValid/0.1 (+https://github.com/ZOOGOM/stillvalid)",
          Accept: "text/html,text/plain;q=0.9,application/pdf;q=0.8",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirects === 3)
          throw new AppError("source_unavailable", 422);
        url = publicUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw sourceHttpError(response.status);
      }
      const type = response.headers.get("content-type") || "";
      const pdf =
        type.split(";", 1)[0].trim().toLowerCase() === "application/pdf";
      try {
        if (!pdf) sourceMediaType(type);
      } catch (error) {
        await response.body?.cancel();
        throw error;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new AppError("source_unavailable", 422);
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        bytes += chunk.byteLength;
        if (bytes > (pdf ? pdfByteLimit : 600000)) {
          await reader.cancel();
          throw new AppError("source_too_large", 422);
        }
        chunks.push(chunk);
      }
      const parsed = pdf
        ? await pdfText(new Uint8Array(Buffer.concat(chunks)), url)
        : parseSourceDocument(
            decodeSourceBody(Buffer.concat(chunks), type),
            type,
            url,
          );
      return {
        id,
        url: url.href,
        ...parsed,
        fetchedAt: new Date().toISOString(),
        ...authorityFor(url.hostname),
        ...(pdf ? { format: "pdf" as const } : {}),
      };
    } catch (error) {
      throw sourceTransportError(error);
    } finally {
      await dispatcher.close();
    }
  }
  throw new AppError("source_unavailable", 422);
}
