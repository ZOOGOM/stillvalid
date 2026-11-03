import test from "node:test";
import assert from "node:assert/strict";
import {
  isPublicAddress,
  publicUrl,
  htmlText,
  decodeSourceBody,
} from "../src/lib/source";
import { validateImage, candidatesFromResponse } from "../src/lib/meta";
import { NextRequest } from "next/server";
import { sameOrigin } from "../src/lib/store";
import { readJson } from "../src/lib/http";

test("loopback, private, mapped, metadata and reserved destinations are blocked", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.1.1",
    "172.16.0.1",
    "192.168.0.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("unsafe protocols, encoded IPs, local names, ports and credentials cannot be fetched", () => {
  for (const url of [
    "http://nypl.org",
    "file:///etc/passwd",
    "https://127.1/",
    "https://0x7f000001/",
    "https://localhost/",
    "https://server.local/",
    "https://10.0.0.1/",
    "https://name:password@nypl.org/",
    "https://nypl.org:8080/",
    "javascript:alert(1)",
  ])
    assert.throws(() => publicUrl(url), /source_url/, url);
  assert.equal(
    publicUrl("https://nypl.org/notice#section").href,
    "https://nypl.org/notice",
  );
});
test("search candidates come only from returned search results and citations", () => {
  const candidates = candidatesFromResponse({
    output: [
      {
        type: "web_search_call",
        results: [
          { title: "bad", url: "https://127.0.0.1" },
          { title: "real", url: "https://nypl.org/notice" },
        ],
      },
      {
        type: "message",
        content: [
          {
            text: "invented https://fake.org",
            annotations: [
              { type: "url_citation", url: "https://nypl.org/notice" },
            ],
          },
        ],
      },
    ],
  });
  assert.deepEqual(candidates, [
    { title: "real", url: "https://nypl.org/notice" },
  ]);
});
test("HTML instructions are extracted as text, scripts and page chrome are not", () => {
  const r = htmlText(
    "<html><head><title>Notice</title></head><body><nav>Menu</nav><main><h1>Reading group</h1><p>Deadline: 10 November.</p><script>alert(1)</script></main></body></html>",
  );
  assert.equal(r.title, "Notice");
  assert.ok(r.text.includes("Deadline: 10 November."));
  assert.ok(!r.text.includes("alert(1)"));
  assert.ok(!r.text.includes("Menu"));
});
test("an image MIME label cannot disguise an arbitrary file", () => {
  assert.throws(() =>
    validateImage(
      "data:image/png;base64," + Buffer.from("not an image").toString("base64"),
    ),
  );
  assert.throws(() => validateImage("data:image/svg+xml;base64,PHN2Zz4="));
  validateImage(
    "data:image/png;base64," +
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]).toString("base64"),
  );
});
test("cross-origin writes fail before any provider call", () => {
  const req = new NextRequest("https://stillvalid.example/api/checks", {
    method: "POST",
    headers: { origin: "https://other.example" },
  });
  assert.throws(() => sameOrigin(req));
});
test("streamed bodies are bounded even without Content-Length", async () => {
  const req = new NextRequest("https://stillvalid.example/api/checks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(2000) }),
  });
  await assert.rejects(() => readJson(req, 100), { code: "too_large" });
});
test("declared Korean source encodings are decoded without corrupting the evidence", () => {
  assert.equal(
    decodeSourceBody(
      Uint8Array.from([0xbe, 0xc8, 0xb3, 0xbb]),
      "text/plain; charset=euc-kr",
    ),
    "안내",
  );
});
test("invalid source bytes fail rather than generating replacement-character evidence", () => {
  assert.throws(
    () =>
      decodeSourceBody(
        Uint8Array.from([0xff, 0xfe]),
        "text/plain; charset=utf-8",
      ),
    { code: "source_format" },
  );
});
test("long source pages are not silently truncated before evidence checking", () => {
  assert.throws(() => htmlText("<main>" + "x".repeat(22001) + "</main>"), {
    code: "source_format",
  });
});
