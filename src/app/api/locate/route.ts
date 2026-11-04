import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MetaClient, configured, validateImage } from "@/lib/meta";
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
export const maxDuration = 45;
const schema = z.object({ image: z.string().max(3900000) });

// Opt-in crop suggestion: one SAM 3.1 call per user tap. It shares the
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
    try {
      const box = await new MetaClient(undefined, async () => {
        await reserveModelCall();
        modelCalls++;
      }).locate(
        parsed.data.image,
        AbortSignal.any([request.signal, AbortSignal.timeout(35000)]),
      );
      found = !!box;
      return NextResponse.json(
        { box, timing: { locateMs: Date.now() - started, modelCalls } },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      console.info(
        JSON.stringify({
          event: "locate_timing",
          locateMs: Date.now() - started,
          modelCalls,
          found,
        }),
      );
      await releaseWork(lease, actor).catch(() => {});
    }
  } catch (error) {
    return errorResponse(error);
  }
}
