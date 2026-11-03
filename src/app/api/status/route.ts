import { NextRequest, NextResponse } from "next/server";
import { configured } from "@/lib/meta";
import { cleanup, newSession } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  let storage = true;
  try {
    await cleanup();
  } catch {
    storage = false;
  }
  const response = NextResponse.json(
    { liveAvailable: configured() && storage, demoAvailable: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (!/^[a-f0-9]{64}$/.test(request.cookies.get("sv_session")?.value || ""))
    response.cookies.set("sv_session", newSession(), {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(process.env.APP_URL || request.url).protocol === "https:",
      maxAge: 86400,
      path: "/",
    });
  return response;
}
