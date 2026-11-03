import assert from "node:assert/strict";
import test from "node:test";
import { copy } from "../src/lib/i18n";
import { resultLanguages } from "../src/lib/languages";
import { resultCopy } from "../src/lib/result-i18n";

test("one display language provides complete interface and result text", () => {
  const expectedKeys = Object.keys(copy("en")).sort();
  for (const language of resultLanguages) {
    const ui = copy(language);
    assert.deepEqual(Object.keys(ui).sort(), expectedKeys, language);
    for (const [key, value] of Object.entries(ui)) {
      assert.ok(value.trim(), `${language}: ${key}`);
    }
    for (const [key, value] of Object.entries(resultCopy(language))) {
      assert.equal(ui[key as keyof typeof ui], value, `${language}: ${key}`);
    }
    assert.ok(ui.locationDetected.includes("{country}"), language);
    assert.match(ui.locationPrivacy, /StillValid/);
  }
});
