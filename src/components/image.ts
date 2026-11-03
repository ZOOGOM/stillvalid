export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
function encodeImage(canvas: HTMLCanvasElement): string {
  for (const quality of [0.92, 0.8, 0.68, 0.55]) {
    const encoded = canvas.toDataURL("image/jpeg", quality);
    if (encoded.length <= 3800000) return encoded;
  }
  throw new Error("image_compression");
}
export async function prepareImage(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("too_large");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("image_type");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url),
      scale = Math.min(1, 2400 / Math.max(image.width, image.height));
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
