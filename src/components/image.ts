export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
// Only near-white blank edge pixels are removed. All ink, including faint
// marks, dates at an edge, and the spacing between separate notices is kept.
// This is not document detection and does not make an extra model request.
export function blankMarginBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] >= 252 && data[i + 1] >= 252 && data[i + 2] >= 252) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right - left < 64 || bottom - top < 64) return null;
  const margin = Math.max(12, Math.ceil(Math.max(width, height) * 0.02));
  const x = Math.max(0, left - margin),
    y = Math.max(0, top - margin);
  const w = Math.min(width, right + margin + 1) - x;
  const h = Math.min(height, bottom + margin + 1) - y;
  return w * h <= width * height * 0.9 ? { x, y, width: w, height: h } : null;
}
function trimBlankMargins(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // Bound temporary ImageData memory on rotated phone photos.
  if (canvas.width * canvas.height > 6_000_000) return canvas;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const box = blankMarginBox(
    context.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width,
    canvas.height,
  );
  if (!box) return canvas;
  const cropped = document.createElement("canvas");
  cropped.width = box.width;
  cropped.height = box.height;
  const output = cropped.getContext("2d");
  if (!output) return canvas;
  output.drawImage(
    canvas,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height,
  );
  return cropped;
}
function encodeImage(input: HTMLCanvasElement): string {
  const canvas = trimBlankMargins(input);
  for (const quality of [0.92, 0.8, 0.68, 0.55]) {
    const encoded = canvas.toDataURL("image/jpeg", quality);
    if (encoded.length <= 3800000) return encoded;
  }
  throw new Error("image_compression");
}
export async function prepareImage(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("too_large");
  // iPhone photos can arrive as HEIC/HEIF (for example from Files). Browsers
  // that can decode them (recent Safari) re-encode to JPEG below; others get
  // a HEIC-specific message instead of a generic type error.
  const heic =
    /^image\/hei[cf](?:-sequence)?$/.test(file.type) ||
    (!file.type && /\.hei[cf]$/i.test(file.name));
  if (!heic && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("image_type");
  const url = URL.createObjectURL(file);
  try {
    let image: HTMLImageElement;
    try {
      image = await loadImage(url);
    } catch {
      throw new Error(heic ? "image_heic" : "image_type");
    }
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image_type");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return encodeImage(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function transformImage(
  src: string,
  rotation: number,
  crop?: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const image = await loadImage(src),
    radians = (rotation * Math.PI) / 180;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(
    Math.abs(Math.cos(radians) * image.width) +
      Math.abs(Math.sin(radians) * image.height),
  );
  canvas.height = Math.round(
    Math.abs(Math.sin(radians) * image.width) +
      Math.abs(Math.cos(radians) * image.height),
  );
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  if (!crop) return encodeImage(canvas);
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(crop.width));
  output.height = Math.max(1, Math.round(crop.height));
  output
    .getContext("2d")!
    .drawImage(
      canvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      output.width,
      output.height,
    );
  return encodeImage(output);
}
