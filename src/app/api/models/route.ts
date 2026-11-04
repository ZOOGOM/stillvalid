// TEMPORARY: lists the model IDs this deployment's Meta key can use, so a
// faster reading model can be chosen. Returns IDs only (no key, no other
// fields), makes no inference call, and is removed after use.
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const key = process.env.META_API_KEY || process.env.MODEL_API_KEY;
  if (!key)
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const response = await fetch("https://api.meta.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = (await response.json().catch(() => null)) as {
      data?: { id?: unknown }[];
    } | null;
    const ids = (data?.data || [])
      .map((m) => (typeof m.id === "string" ? m.id.slice(0, 80) : null))
      .filter(Boolean);
    return NextResponse.json(
      { status: response.status, ids },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
