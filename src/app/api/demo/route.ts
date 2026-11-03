import { NextRequest, NextResponse } from "next/server";
import { demoIds, demoResult, type DemoId } from "@/lib/demo";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "deadline";
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "ko";
  if (!demoIds.includes(id as DemoId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { result: demoResult(id as DemoId, lang) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
