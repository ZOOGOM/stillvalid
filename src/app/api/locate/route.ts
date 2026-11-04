import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MetaClient,
  configured,
  locatePrompts,
  validateImage,
  type LocateDiagnostic,
} from "@/lib/meta";
import { AppError } from "@/lib/schema";
import {
  owner,
  acquireExtraction,
  releaseWork,
  sameOrigin,
  reserveModelCall,
} from "@/lib/store";
import { errorResponse, readJson } from "@/lib/http";
import { abuseKey, abuseSecret } from "@/lib/abuse";
export const runtime = "nodejs";
export const maxDuration = 75;
const schema = z.object({
  image: z.string().max(3900000),
  // Diagnosis only: one of a fixed list of short noun phrases.
  prompt: z.enum(locatePrompts).optional(),
});

// Opt-in crop suggestion: one SAM 3.1 call per user tap, or two when the
// first concept phrase finds nothing. It shares the
// extraction slots, per-session and IP limits and the daily model allowance.
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const actor = owner(request);
    if (!configured()) throw new AppError("not_configured", 503);
    const parsed = schema.safeParse(await readJson(request, 4000000));
    if (!parsed.success) throw new AppError("input");
    validateImage(parsed.data.image);
    const lease = await acquireExtraction(
      actor,
      abuseKey(request.headers, {
        vercel: process.env.VERCEL,
        secret: abuseSecret(),
      }),
    );
    const started = Date.now();
    let modelCalls = 0;
    let found = false;
    let shape: LocateDiagnostic | null = null;
    try {
      const { box, boxes, diagnostic } = await new MetaClient(
        undefined,
        async () => {
          await reserveModelCall();
          modelCalls++;
        },
      ).locate(
        parsed.data.image,
        AbortSignal.any([request.signal, AbortSignal.timeout(65000)]),
        parsed.data.prompt,
      );
      found = !!box;
      shape = diagnostic;
      return NextResponse.json(
        {
          box,
          boxes,
          diagnostic,
          timing: { locateMs: Date.now() - started, modelCalls },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      console.info(
        JSON.stringify({
          event: "locate_timing",
          locateMs: Date.now() - started,
          modelCalls,
          found,
          // Response shape only (types, lengths, token counts).
          shape,
        }),
      );
      await releaseWork(lease, actor).catch(() => {});
    }
  } catch (error) {
    return errorResponse(error);
  }
}
