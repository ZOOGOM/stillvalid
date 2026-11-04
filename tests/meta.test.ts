import test from "node:test";
import assert from "node:assert/strict";
import { MetaClient } from "../src/lib/meta";
import { comparisonSchema, noticeSchema } from "../src/lib/schema";
import { resultLanguages } from "../src/lib/languages";
import { z } from "zod";
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
        assert.equal(
          "content_kind" in body.response_format.json_schema.schema.properties,
          false,
        );
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
    const imageNotice = {
      ...notice,
      originalText: fullText,
      content_kind: "notice",
    };
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
          assert.deepEqual(
            body.response_format.json_schema.schema.properties.content_kind
              .enum,
            ["notice", "not_notice", "uncertain"],
          );
          assert.ok(
            body.response_format.json_schema.schema.required.includes(
              "content_kind",
            ),
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
test("title cleanup requires separate exact source headings and preserves real titles", () =>
  withTestKey(async () => {
    for (const [title, institution, originalText, expected] of [
      ["Museum Fellowships", "Museum", "Museum\nFellowships", "Fellowships"],
      ["Fellowships | Museum", "Museum", "Museum\nFellowships", "Fellowships"],
      [
        "Museum Fellowships",
        "Museum",
        "Museum Fellowships",
        "Museum Fellowships",
      ],
      ["Museum", "Museum", "Museum", "Museum"],
      [
        "Museum Fellowships",
        "Museum",
        "Museum\nOther programme",
        "Museum Fellowships",
      ],
      [
        "Museum Fellowships",
        "Museum",
        "Some Museum details\nFellowships",
        "Museum Fellowships",
      ],
      ["Museumship", "Museum", "Museum\nship", "Museumship"],
      ["도서관 독서 모임", "도서관", "도서관\n독서 모임", "독서 모임"],
      ["Ａ館 募集", "A館", "A館\n募集", "Ａ館 募集"],
      ["İnstitute Event", "institute", "institute\nEvent", "İnstitute Event"],
      ["Café Event", "Cafe\u0301", "Cafe\u0301\nEvent", "Café Event"],
    ]) {
      const client = new MetaClient(
        async () =>
          Response.json({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    ...notice,
                    title,
                    institution,
                  }),
                },
              },
            ],
          }),
        () => {},
      );
      const result = await client.extract(originalText, undefined, null);
      assert.equal(result.title, expected);
      assert.equal(result.originalText, originalText);
    }
  }));
test("only an explicitly non-notice image without readable or supplied text is rejected", () =>
  withTestKey(async () => {
    const image = "data:image/png;base64,fixture";
    const makeClient = (output: unknown) =>
      new MetaClient(
        async () =>
          Response.json({
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify(output) },
              },
            ],
          }),
        () => {},
      );
    const noText = {
      ...notice,
      title: "",
      institution: "",
      edition: null,
      country: null,
      originalText: "",
      fields: [],
      content_kind: "not_notice",
    };
    await assert.rejects(() => makeClient(noText).extract("", image, null), {
      code: "not_a_notice",
      status: 422,
    });
    for (const content_kind of ["notice", "uncertain", "not_notice"]) {
      const result = await makeClient({ ...notice, content_kind }).extract(
        "",
        image,
        null,
      );
      assert.deepEqual(result, notice);
      assert.equal("content_kind" in result, false);
    }
    const supplied = "Community announcement\nMore details to follow.";
    const result = await makeClient(noText).extract(supplied, image, null);
    assert.equal(result.originalText, supplied);
    assert.equal(result.title, "Community announcement");
    assert.deepEqual(result.fields, []);
    const combined = await makeClient({
      ...notice,
      content_kind: "notice",
    }).extract(supplied, image, null);
    assert.equal(
      combined.originalText,
      notice.originalText + "\n\n" + supplied,
    );
    await assert.rejects(
      () =>
        makeClient({ ...noText, content_kind: "uncertain" }).extract(
          "",
          image,
          null,
        ),
      { code: "model_output" },
    );
    await assert.rejects(
      () =>
        makeClient({ ...notice, content_kind: "notice" }).extract(
          "x".repeat(18000),
          image,
          null,
        ),
      { code: "model_output" },
    );
  }));
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
    const modelOutput = {
      same_notice: true,
      identity_quote: "Workshop. Open.",
      country: "US",
      source_role: "original",
      comparisons: [
        {
          key: "status",
          before: "Open",
          after: "Open",
          before_quote: "Workshop. Open.",
          after_quote: "Workshop. Open.",
          relation: "same",
        },
      ],
    };
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
        assert.equal(body.max_completion_tokens, 12000);
        assert.equal(payload.result_language, expected);
        assert.deepEqual(payload.notice, notice);
        assert.equal(payload.source.text, source.text);
        const providerSchema = body.response_format.json_schema.schema;
        const internalSchema = z.toJSONSchema(comparisonSchema);
        assert.equal(body.response_format.json_schema.strict, true);
        assert.equal("summary" in providerSchema.properties, false);
        assert.equal("next_action" in providerSchema.properties, false);
        for (const key of Object.keys(modelOutput)) {
          assert.deepEqual(
            providerSchema.properties[key],
            internalSchema.properties?.[key],
          );
          assert.ok(providerSchema.required.includes(key));
        }
        assert.deepEqual(
          Object.keys(providerSchema.properties).sort(),
          Object.keys(modelOutput).sort(),
        );
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(modelOutput),
              },
            },
          ],
        });
      },
      () => {},
    );
    for (const lang of resultLanguages) {
      expected = lang;
      assert.deepEqual(await client.compare(notice, source, lang), {
        ...modelOutput,
        summary: "",
        next_action: "",
      });
    }
  }));
test("comparison truncation remains an error without retry at the larger limit", () =>
  withTestKey(async () => {
    let calls = 0;
    const client = new MetaClient(
      async (_input, init) => {
        calls++;
        assert.equal(
          JSON.parse(String(init?.body)).max_completion_tokens,
          12000,
        );
        return Response.json({
          choices: [
            {
              finish_reason: "length",
              message: {
                content: JSON.stringify({
                  same_notice: false,
                  identity_quote: "",
                  country: null,
                  source_role: "unknown",
                  comparisons: [],
                  summary: "",
                  next_action: "",
                }),
              },
            },
          ],
        });
      },
      () => {},
    );
    await assert.rejects(
      () =>
        client.compare(
          notice,
          {
            id: "source-0",
            url: "https://nypl.org/notice",
            title: "Notice",
            text: notice.originalText,
            authority: "registered",
            fetchedAt: "2026-11-03T00:00:00Z",
          },
          "en",
        ),
      { code: "model_output", status: 422 },
    );
    assert.equal(calls, 1);
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

test("an extraction stall or provider 5xx is retried once; limits, refusals and cancels are not", () =>
  withTestKey(async () => {
    const { originalText: _ignored, ...extracted } = notice;
    const ok = () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(extracted) },
          },
        ],
      });
    const stall = (init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) return reject(init.signal.reason);
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    // AbortSignal.timeout timers do not keep the test's event loop alive.
    const keepAlive = setInterval(() => {}, 1000);
    // 5xx then success: exactly two reservations and calls.
    for (const first of [
      () => Promise.resolve(new Response("", { status: 503 })),
      () => Promise.reject(new TypeError("fetch failed")),
    ]) {
      let calls = 0;
      let reserved = 0;
      const client = new MetaClient(
        async () => (++calls === 1 ? first() : ok()),
        () => {
          reserved++;
        },
      );
      const result = await client.extract("Workshop. Open.", undefined, null);
      assert.equal(result.title, "Workshop");
      assert.equal(calls, 2);
      assert.equal(reserved, 2);
    }
    // Two consecutive failures surface model_unavailable after two calls.
    let calls = 0;
    await assert.rejects(
      new MetaClient(
        async () => {
          calls++;
          return new Response("", { status: 502 });
        },
        () => {},
      ).extract("Workshop. Open.", undefined, null),
      { code: "model_unavailable" },
    );
    assert.equal(calls, 2);
    // Rate limits, client errors and caller cancellation are never retried.
    for (const [status, code] of [
      [429, "provider_limit"],
      [400, "model_unavailable"],
    ] as const) {
      calls = 0;
      await assert.rejects(
        new MetaClient(
          async () => {
            calls++;
            return new Response("", { status });
          },
          () => {},
        ).extract("Workshop. Open.", undefined, null),
        { code },
      );
      assert.equal(calls, 1, String(status));
    }
    calls = 0;
    const abort = new AbortController();
    const pending = new MetaClient(
      async (_input, init) => {
        calls++;
        return stall(init);
      },
      () => {},
    ).extract("Workshop. Open.", undefined, null, abort.signal);
    abort.abort();
    await assert.rejects(pending, { code: "cancelled" });
    assert.equal(calls, 1);
    // A route deadline (timeout signal) reports a stall, not a user cancel.
    calls = 0;
    await assert.rejects(
      new MetaClient(
        async (_input, init) => {
          calls++;
          return stall(init);
        },
        () => {},
      ).extract("Workshop. Open.", undefined, null, AbortSignal.timeout(30)),
      { code: "model_unavailable" },
    );
    assert.equal(calls, 1);
    clearInterval(keepAlive);
  }));

test("notice location sends one SAM 3.1 request and keeps the best large box", () =>
  withTestKey(async () => {
    const png =
      "data:image/png;base64," +
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]).toString("base64");
    let reserved = 0;
    let sent: Record<string, unknown> = {};
    const client = new MetaClient(
      async (input, init) => {
        assert.ok(String(input).endsWith("/responses"));
        sent = JSON.parse(String(init?.body));
        return Response.json({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "<0f>0<|box;x1=10;y1=10;x2=40;y2=30;w=1000;h=800;c=0.99|><|mask;x=0;y=0;c=0.99;data=2,2,!ab|>,1<|box;x1=120;y1=80;x2=880;y2=760;w=1000;h=800;c=0.91|><|mask;x=0;y=0;c=0.91;data=2,2,!cd|>",
                },
              ],
            },
          ],
        });
      },
      () => {
        reserved++;
      },
    );
    const { box, diagnostic } = await client.locate(png);
    assert.equal(reserved, 1);
    assert.equal(sent.model, "sam-3.1");
    const content = (sent.input as { content: { type: string }[] }[])[0]
      .content;
    assert.deepEqual(
      content.map((part) => part.type),
      ["input_text", "input_image"],
    );
    assert.deepEqual(sent.metadata, {
      include_confidence: "true",
      mask_encoding: "one_bit",
    });
    // The tiny high-confidence box (a label) is not offered as the notice.
    assert.deepEqual(box, {
      x1: 120,
      y1: 80,
      x2: 880,
      y2: 760,
      w: 1000,
      h: 800,
      c: 0.91,
    });
    // The diagnostic holds only shape, lengths and token counts.
    assert.deepEqual(diagnostic, {
      prompt: "poster",
      status: null,
      incomplete: null,
      topKeys: ["output"],
      outputTypes: ["message"],
      partTypes: ["output_text"],
      textLength: diagnostic.textLength,
      frames: 1,
      boxTokens: 2,
      maskTokens: 2,
      boxAreas: [0, 65],
    });
    assert.ok(!JSON.stringify(diagnostic).includes("data="));
    // A fixed alternative prompt is sent as given.
    await client.locate(png, undefined, "document");
    assert.equal(
      (sent.input as { content: { text?: string }[] }[])[0].content[0].text,
      "document",
    );
    // Zero matches is a normal empty result, not an error.
    const none = new MetaClient(
      async () => Response.json({ output_text: "" }),
      () => {},
    );
    const empty = await none.locate(png);
    assert.equal(empty.box, null);
    assert.equal(empty.diagnostic.textLength, 0);
    assert.equal(empty.diagnostic.boxTokens, 0);
    // A non-image upload is rejected before any provider call.
    let calls = 0;
    await assert.rejects(
      new MetaClient(
        async () => {
          calls++;
          return Response.json({});
        },
        () => {},
      ).locate("data:image/png;base64,bm90IGFuIGltYWdl"),
    );
    assert.equal(calls, 0);
  }));

test("malformed or out-of-frame SAM boxes are ignored", async () => {
  const { bestNoticeBox } = await import("../src/lib/meta");
  assert.equal(
    bestNoticeBox(
      "<|box;x1=50;y1=50;x2=10;y2=10;w=100;h=100|><|box;x1=0;y1=0;x2=500;y2=90;w=100;h=100|><|box;x1=a;y1=0;x2=90;y2=90;w=100;h=100|>",
    ),
    null,
  );
  // Without confidence values the larger qualifying box wins.
  assert.deepEqual(
    bestNoticeBox(
      "<|box;x1=0;y1=0;x2=40;y2=40;w=100;h=100|>,<|box;x1=5;y1=5;x2=95;y2=95;w=100;h=100|>",
    ),
    { x1: 5, y1: 5, x2: 95, y2: 95, w: 100, h: 100, c: null },
  );
});
