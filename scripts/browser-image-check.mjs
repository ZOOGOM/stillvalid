// Exercise the actual photo preparation module in Chromium; no network or models.
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
const source = await readFile(
  new URL("../src/components/image.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const moduleUrl =
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (url) => {
    const { prepareImage, transformImage, loadImage } = await import(url);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1200, 1600);
    ctx.fillStyle = "#222";
    ctx.fillRect(200, 300, 800, 1000);
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText("서울영커리언스 2026.11.04", 220, 340);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    const prepared = await prepareImage(
      new File([blob], "notice.png", { type: "image/png" }),
    );
    const image = await loadImage(prepared);
    const rotate = await loadImage(await transformImage(prepared, 90));
    const crop = await loadImage(
      await transformImage(prepared, 0, {
        x: 60,
        y: 60,
        width: 600,
        height: 700,
      }),
    );
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(0, 0, 1200, 1600);
    const colored = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    const kept = await loadImage(
      await prepareImage(
        new File([colored], "photo.png", { type: "image/png" }),
      ),
    );
    return {
      before: [1200, 1600],
      after: [image.width, image.height],
      rotated: [rotate.width, rotate.height],
      manualCrop: [crop.width, crop.height],
      colored: [kept.width, kept.height],
      jpeg: prepared.startsWith("data:image/jpeg;base64,"),
    };
  }, moduleUrl);
  assert.ok(
    result.after[0] >= 800 && result.after[1] >= 1000,
    "original printed pixels keep their scale",
  );
  assert.ok(
    result.after[0] * result.after[1] < 1200 * 1600 * 0.6,
    "blank borders reduce image area",
  );
  assert.deepEqual(result.rotated, [...result.after].reverse());
  assert.deepEqual(result.manualCrop, [600, 700]);
  assert.deepEqual(result.colored, result.before);
  assert.equal(result.jpeg, true);
  console.log(JSON.stringify({ passed: true, ...result }, null, 2));
} finally {
  await browser.close();
}
