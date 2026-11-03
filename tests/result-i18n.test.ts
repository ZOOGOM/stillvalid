import assert from "node:assert/strict";
import test from "node:test";
import { copy } from "../src/lib/i18n";
import { resultLanguages } from "../src/lib/languages";
import { resultCopy, type ResultCopyKey } from "../src/lib/result-i18n";

test("every result language has the same nonempty result labels", () => {
  const english = resultCopy("en");
  const keys = Object.keys(english).sort() as ResultCopyKey[];
  for (const language of resultLanguages) {
    const translated = resultCopy(language);
    assert.deepEqual(Object.keys(translated).sort(), keys, language);
    for (const key of keys) {
      assert.ok(translated[key].trim(), `${language}: ${key}`);
    }
    if (language !== "en" && language !== "ko") {
      assert.notDeepEqual(translated, english, language);
    }
  }
});

test("Korean and English result labels preserve existing wording", () => {
  for (const language of ["ko", "en"] as const) {
    const result = resultCopy(language);
    const existing = copy(language);
    for (const key of Object.keys(result) as ResultCopyKey[]) {
      assert.equal(result[key], existing[key], `${language}: ${key}`);
    }
  }
});
