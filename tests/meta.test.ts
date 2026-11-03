import test from "node:test";
import assert from "node:assert/strict";
import { MetaClient } from "../src/lib/meta";
import { comparisonSchema, noticeSchema } from "../src/lib/schema";
import { resultLanguages } from "../src/lib/languages";
const notice = {
  title: "Workshop",
  institution: "Library",
  edition: "2026",
  country: "US",
  originalText: "Workshop. Open.",
  fields: [],
};
test("text extraction preserves the complete supplied text without asking the model to echo it", () =>
  withTestKey(async () => {
    const { originalText: _ignored, ...extracted } = notice;
    const client = new MetaClient(
      async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.equal(
          "originalText" in body.response_format.json_schema.schema.properties,
          false,
        );
        assert.equal(body.max_completion_tokens, 4500);
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(extracted) },
            },
          ],
        });
      },
      () => {},
    );
    const original = "Workshop. Open. " + "Complete input. ".repeat(500);
    assert.equal(
      (await client.extract(original, undefined, null)).originalText,
      original,
    );
  }));
test("image extraction has bounded transcription headroom and rejects truncation without retry", () =>
  withTestKey(async () => {
    const fullText = "Full transcribed notice. ".repeat(500);
    const imageNotice = { ...notice, originalText: fullText };
    for (const finish of ["stop", "length"]) {
      let calls = 0;
      const client = new MetaClient(
        async (_input, init) => {
          calls++;
          const body = JSON.parse(String(init?.body));
          assert.equal(body.max_completion_tokens, 6000);
          assert.ok(
            body.response_format.json_schema.schema.properties.originalText,
          );
          assert.equal(body.messages[1].content[1].type, "image_url");
          return Response.json({
            choices: [
              {
                finish_reason: finish,
                message: { content: JSON.stringify(imageNotice) },
              },
            ],
          });
        },
        () => {},
      );
      const extraction = client.extract(
        "",
        "data:image/png;base64,fixture",
        null,
      );
      if (finish === "stop")
        assert.equal((await extraction).originalText, fullText);
      else
        await assert.rejects(() => extraction, {
          code: "model_output",
          status: 422,
        });
      assert.equal(calls, 1);
    }
  }));
async function withTestKey(fn: () => Promise<void>) {
  const previous = process.env.META_API_KEY;
  process.env.META_API_KEY = "test-only-not-a-real-credential";
  try {
    await fn();
  } finally {
    if (previous === undefined) delete process.env.META_API_KEY;
    else process.env.META_API_KEY = previous;
  }
}
test("Meta structured requests use the documented endpoint, model and JSON schema", () =>
  withTestKey(async () => {
    let reserved = 0;
    const client = new MetaClient(
      async (input, init) => {
        assert.equal(input, "https://api.meta.ai/v1/chat/completions");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.model, process.env.META_MODEL || "muse-spark-1.3");
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        assert.equal(body.messages[0].role, "developer");
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(notice) },
            },
          ],
        });
      },
      () => {
        reserved++;
      },
    );
    const parsed = await client.structured(
      "notice",
      noticeSchema,
      "Read notice",
      { text: "Workshop. Open." },
    );
    assert.equal(parsed.title, "Workshop");
    assert.equal(reserved, 1);
  }));
test("Meta provider errors do not expose response bodies or credentials", () =>
  withTestKey(async () => {
    const client = new MetaClient(
      async () => new Response("sensitive provider detail", { status: 401 }),
      () => {},
    );
    await assert.rejects(() => client.call("/chat/completions", {}), {
      code: "model_unavailable",
      status: 503,
    });
  }));
test("truncated model JSON cannot become a verified result", () =>
  withTestKey(async () => {
    const client = new MetaClient(
      async () =>
        Response.json({
          choices: [
            { finish_reason: "length", message: { content: '{"title":' } },
          ],
        }),
      () => {},
    );
    await assert.rejects(
      () => client.structured("notice", noticeSchema, "Read", {}),
      { code: "model_output" },
    );
  }));
test("malformed provider envelopes are reported as model output errors", () =>
  withTestKey(async () => {
    for (const body of ["{", "null", "[]"]) {
      const client = new MetaClient(
        async () => new Response(body),
        () => {},
      );
      await assert.rejects(() => client.call("/chat/completions", {}), {
        code: "model_output",
        status: 422,
      });
    }
  }));
test("output diagnostics log only fixed categories and preserve the public error", (t) =>
  withTestKey(async () => {
    const logs: unknown[][] = [];
    t.mock.method(console, "error", (...args: unknown[]) => logs.push(args));
    const sensitive = "private-provider-content-and-credential";
    const envelope = (content: unknown, finish = "stop", refusal?: string) =>
      JSON.stringify({
        choices: [{ finish_reason: finish, message: { content, refusal } }],
      });
    const cases = [
      [sensitive, "response_json"],
      [JSON.stringify([sensitive]), "response_shape"],
      [envelope(sensitive, "length"), "completion_length"],
      [envelope(sensitive, sensitive), "completion_not_stopped"],
      [JSON.stringify({ private: sensitive }), "completion_not_stopped"],
      [envelope("", "stop"), "completion_empty"],
      [envelope(sensitive, "stop", sensitive), "completion_refusal"],
      [envelope(sensitive), "content_json"],
      [envelope(JSON.stringify({ country: sensitive })), "schema_mismatch"],
    ];
    for (const [body, reason] of cases) {
      logs.length = 0;
      const client = new MetaClient(
        async () => new Response(body),
        () => {},
      );
      await assert.rejects(
        () =>
          client.structured(
            "untrusted-schema-name",
            noticeSchema,
            sensitive,
            {},
          ),
        { code: "model_output", status: 422, message: "model_output" },
      );
      assert.deepEqual(logs, [
        [JSON.stringify({ event: "model_output_rejected", reason })],
      ]);
    }
    logs.length = 0;
    const client = new MetaClient(
      async () => new Response(envelope(JSON.stringify(notice))),
      () => {},
    );
    assert.deepEqual(
      await client.structured("notice", noticeSchema, "Read", {}),
      notice,
    );
    assert.deepEqual(logs, []);
  }));
test("notice and comparison countries accept supported codes or null only", () => {
  const comparison = {
    same_notice: false,
    identity_quote: "",
    country: null,
    source_role: "unknown",
    comparisons: [],
    summary: "",
    next_action: "",
  };
  for (const country of ["GB", "US", "KR", null]) {
    assert.equal(noticeSchema.safeParse({ ...notice, country }).success, true);
    assert.equal(
      comparisonSchema.safeParse({ ...comparison, country }).success,
      true,
    );
  }
  for (const country of ["X", "1", "12", "ZZ", "us", ""]) {
    assert.equal(noticeSchema.safeParse({ ...notice, country }).success, false);
    assert.equal(
      comparisonSchema.safeParse({ ...comparison, country }).success,
      false,
    );
  }
});
test("invalid model country fails extraction and comparison", () =>
  withTestKey(async () => {
    const response = (content: unknown) =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(content) },
          },
        ],
      });
    const { originalText: _ignored, ...extracted } = notice;
    const extractor = new MetaClient(
      async () => response({ ...extracted, country: "12" }),
      () => {},
    );
    await assert.rejects(
      () => extractor.extract(notice.originalText, undefined, null),
      {
        code: "model_output",
      },
    );
    const comparator = new MetaClient(
      async () =>
        response({
          same_notice: false,
          identity_quote: "",
          country: "ZZ",
          source_role: "unknown",
          comparisons: [],
          summary: "",
          next_action: "",
        }),
      () => {},
    );
    await assert.rejects(
      () =>
        comparator.compare(
          notice,
          {
            id: "source-0",
            url: "https://nypl.org/notice",
            title: "Notice",
            text: "Workshop. Open.",
            authority: "registered",
            fetchedAt: "2026-11-03T00:00:00Z",
          },
          "en",
        ),
      { code: "model_output" },
    );
  }));
test("built-in web search uses Responses and preserves actual source candidates", () =>
  withTestKey(async () => {
    const client = new MetaClient(
      async (input, init) => {
        assert.equal(input, "https://api.meta.ai/v1/responses");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.tools[0].type, "web_search");
        assert.deepEqual(body.include, ["web_search_call.results"]);
        return Response.json({
          output: [
            {
              type: "web_search_call",
              results: [{ url: "https://nypl.org/notice", title: "Notice" }],
            },
          ],
        });
      },
      () => {},
    );
    assert.deepEqual(await client.discover(notice, "US"), [
      { url: "https://nypl.org/notice", title: "Notice" },
    ]);
  }));
test("comparison sends the selected result language without changing source facts", () =>
  withTestKey(async () => {
    let expected: string;
    const source = {
      id: "source-0",
      url: "https://nypl.org/notice",
      title: "Notice",
      text: "Workshop. Open.",
      authority: "registered" as const,
      fetchedAt: "2026-11-03T00:00:00Z",
    };
    const client = new MetaClient(
      async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        const payload = JSON.parse(body.messages[1].content);
        assert.equal(body.max_completion_tokens, 4500);
        assert.equal(payload.result_language, expected);
        assert.deepEqual(payload.notice, notice);
        assert.equal(payload.source.text, source.text);
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  same_notice: false,
                  identity_quote: "",
                  country: null,
                  source_role: "unknown",
                  comparisons: [],
                  summary: "invented fact",
                  next_action: "invented action",
                }),
              },
            },
          ],
        });
      },
      () => {},
    );
    for (const lang of resultLanguages) {
      expected = lang;
      await client.compare(notice, source, lang);
    }
  }));
test("extraction rejects values and quotes rewritten from the original", () =>
  withTestKey(async () => {
    const originalText = "Workshop. Status: Open ２０２６";
    const client = new MetaClient(
      async () =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  title: "Workshop",
                  institution: "Library",
                  edition: null,
                  country: null,
                  fields: [
                    {
                      key: "status",
                      value: "open ２０２６",
                      quote: "Status: Open ２０２６",
                    },
                    {
                      key: "status",
                      value: "Open 2026",
                      quote: "Status: Open 2026",
                    },
                    {
                      key: "status",
                      value: "Open ２０２６",
                      quote: "Status: Open  ２０２６",
                    },
                    {
                      key: "status",
                      value: "Open ２０２６",
                      quote: "Status: Open ２０２６",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      () => {},
    );
    const extracted = await client.extract(originalText, undefined, null);
    assert.deepEqual(extracted.fields, [
      { key: "status", value: "Open ２０２６", quote: "Status: Open ２０２６" },
    ]);
  }));
