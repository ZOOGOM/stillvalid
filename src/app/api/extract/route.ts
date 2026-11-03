import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MetaClient, configured, validateImage } from "@/lib/meta";
import { AppError } from "@/lib/schema";
import { isCountry } from "@/lib/countries";
import { owner, reserve, sameOrigin } from "@/lib/store";
import { errorResponse, readJson } from "@/lib/http";
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
    await reserve("extract:" + actor, 20, 3600000);
    const notice = await new MetaClient().extract(
      text,
      image,
      country,
      request.signal,
    );
    if (notice.country && !isCountry(notice.country)) notice.country = null;
    return NextResponse.json(
      { notice },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
