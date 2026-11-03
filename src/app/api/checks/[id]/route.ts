import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteCheck, getCheck, owner, sameOrigin } from "@/lib/store";
import { errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getCheck(id, owner(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const actor = owner(request),
      { id } = await context.params;
    await getCheck(id, actor);
    await deleteCheck(id, actor);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
