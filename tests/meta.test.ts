import test from "node:test";
import assert from "node:assert/strict";
import { MetaClient } from "../src/lib/meta";
import { noticeSchema } from "../src/lib/schema";
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
