import type { NextRequest } from "next/server";
import { deleteAllChecks, owner, sameOrigin } from "@/lib/store";
import { errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export async function DELETE(request: NextRequest) {
  try {
    sameOrigin(request);
    await deleteAllChecks(owner(request));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
