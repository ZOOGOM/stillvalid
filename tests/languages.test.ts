import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/demo/route";
import { demoResult } from "../src/lib/demo";
import {
  isResultLang,
  resultDirection,
  resultLanguageOptions,
  resultLanguages,
  resultLocale,
} from "../src/lib/languages";
import { checkRequestSchema } from "../src/lib/schema";
import { sourceWarningText } from "../src/lib/source-warnings";
import { errorText } from "../src/lib/i18n";

const input = {
  notice: {
    title: "A notice",
    institution: "Library",
    edition: null,
    country: "US",
    originalText: "A notice",
    fields: [],
  },
  country: "KR",
  sourceUrl: "",
  requestKey: "d54ff930-40b8-4876-b06c-3544ea2a711c",
};

test("source failures and input errors have useful text in every display language", () => {
  for (const lang of resultLanguages) {
    for (const code of [
      "source_format",
      "source_encoding",
      "source_too_large",
      "source_timeout",
      "source_blocked",
      "source_not_found",
      "source_not_notice",
    ]) {
      assert.ok(sourceWarningText(code, lang), `${lang}: ${code}`);
    }
    for (const code of ["not_a_notice", "upload_too_large"]) {
      assert.notEqual(errorText(code, lang), errorText("unrecognized", lang));
    }
  }
});

test("all ten result languages are valid independently of the country", () => {
  assert.deepEqual(
    resultLanguageOptions.map((option) => option.code),
    [...resultLanguages],
  );
  for (const lang of resultLanguages) {
    assert.equal(isResultLang(lang), true);
    assert.equal(
      checkRequestSchema.safeParse({ ...input, lang }).success,
      true,
    );
    assert.equal(
      Intl.DateTimeFormat.supportedLocalesOf(resultLocale(lang)).length,
      1,
    );
    assert.equal(resultDirection(lang), lang === "ar" ? "rtl" : "ltr");
  }
  for (const lang of ["", "zh-CN", "EN", "xx", null, 1]) {
    assert.equal(isResultLang(lang), false);
    assert.equal(
      checkRequestSchema.safeParse({ ...input, lang }).success,
      false,
    );
  }
  assert.equal(resultLocale("zh"), "zh-CN");
  assert.equal(resultLocale("pt"), "pt-BR");
});

test("demo endpoint supports each language, defaults to Korean, and rejects invalid values", async () => {
  for (const lang of resultLanguages) {
    const response = GET(
      new NextRequest(`http://localhost/api/demo?lang=${lang}`),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.lang, lang);
  }
  const defaultResponse = GET(new NextRequest("http://localhost/api/demo"));
  assert.equal((await defaultResponse.json()).result.lang, "ko");
  for (const lang of ["", "zh-CN", "xx"]) {
    assert.equal(
      GET(new NextRequest(`http://localhost/api/demo?lang=${lang}`)).status,
      400,
    );
  }
});

test("non-Korean demo results preserve the same synthetic source facts in every result language", () => {
  for (const id of ["deadline", "cancelled", "identity"] as const) {
    const baseline = demoResult(id, "en");
    for (const lang of resultLanguages.filter((value) => value !== "ko")) {
      assert.deepEqual({ ...demoResult(id, lang), lang: "en" }, baseline);
    }
  }
});
