import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MetaClient, configured, validateImage } from "@/lib/meta";
import { AppError } from "@/lib/schema";
import { isCountry } from "@/lib/countries";
import {
  owner,
  acquireExtraction,
  releaseWork,
  sameOrigin,
  reserveModelCall,
} from "@/lib/store";
import { errorResponse, readJson } from "@/lib/http";
import { abuseKey } from "@/lib/abuse";
export const runtime = "nodejs";
export const maxDuration = 90;
const schema = z.object({
  text: z.string().max(18000).default(""),
  image: z.string().max(3900000).optional(),
  country: z.string().refine(isCountry).nullable().default(null),
});
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const actor = owner(request);
    if (!configured()) throw new AppError("not_configured", 503);
    const parsed = schema.safeParse(await readJson(request, 4000000));
    if (!parsed.success) throw new AppError("input");
    const { text, image, country } = parsed.data;
    if (!text.trim() && !image) throw new AppError("input");
    if (image) validateImage(image);
    const lease = await acquireExtraction(
      actor,
      abuseKey(request.headers, {
        vercel: process.env.VERCEL,
        secret: process.env.IP_RATE_LIMIT_SECRET,
      }),
    );
    const started = Date.now();
    let modelCalls = 0;
    try {
      const notice = await new MetaClient(undefined, async () => {
        await reserveModelCall();
        modelCalls++;
      }).extract(
        text,
        image,
        country,
        AbortSignal.any([request.signal, AbortSignal.timeout(80000)]),
      );
      if (notice.country && !isCountry(notice.country)) notice.country = null;
      return NextResponse.json(
        { notice },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      console.info(
        JSON.stringify({
          event: "extract_timing",
          extractMs: Date.now() - started,
          modelCalls,
        }),
      );
      // A failed release keeps the lease until expiry; it must not discard an
      // otherwise successful extraction and encourage another provider call.
      await releaseWork(lease, actor).catch(() => {});
    }
  } catch (error) {
    return errorResponse(error);
  }
}
