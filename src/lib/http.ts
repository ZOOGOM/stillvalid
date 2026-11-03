import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AppError } from "./schema";

export async function readJson(
  request: NextRequest,
  maxBytes: number,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("format", 415);
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new AppError("too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AppError("too_large", 413);
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("input");
  }
}
export function errorResponse(error: unknown): NextResponse {
  const safe =
    error instanceof AppError ? error : new AppError("internal", 500);
  if (!(error instanceof AppError))
    console.error(JSON.stringify({ event: "request_failed", code: safe.code }));
  return NextResponse.json(
    { error: safe.code },
    { status: safe.status, headers: { "Cache-Control": "no-store" } },
  );
}
