import test from "node:test";
import assert from "node:assert/strict";
import { blankMarginBox } from "../src/components/image";

test("blank photo borders can shrink without rescaling or dropping any ink", () => {
  const width = 400,
    height = 300;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const dot = (x: number, y: number, color: number) => {
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = color;
  };
  // Two separate printed sections plus faint punctuation outside them.
  for (let y = 100; y < 200; y++) for (let x = 120; x < 220; x++) dot(x, y, 0);
  dot(80, 80, 251);
  const box = blankMarginBox(data, width, height);
  assert.ok(box && box.width * box.height < (width * height) / 2);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] < 252)
        assert.ok(
          x >= box.x &&
            x < box.x + box.width &&
            y >= box.y &&
            y < box.y + box.height,
        );
    }
});

test("edge dates, colored photographs, blank and sparse images are preserved", () => {
  const width = 200,
    height = 200;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  assert.equal(blankMarginBox(data, width, height), null);
  data[0] = 0;
  assert.equal(blankMarginBox(data, width, height), null);
  for (let y = 50; y < 150; y++)
    for (let x = 50; x < 150; x++) data[(y * width + x) * 4] = 0;
  const box = blankMarginBox(data, width, height);
  assert.ok(
    box && box.x === 0 && box.y === 0,
    "ink at the page corner is retained",
  );
  data.fill(250);
  assert.equal(
    blankMarginBox(data, width, height),
    null,
    "off-white backgrounds are not guessed to be blank",
  );
});
