// Embedded: create a spin from a product AND start its generation in one
// click (in-admin UX is one-step; quota rules still apply — the start is
// refused with a readable message when credits run out).

import { NextRequest, NextResponse } from "next/server";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { importProductCore } from "@/lib/shopify-ops";
import { startGeneration } from "@/lib/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Import runs up to 4 background removals before the queue submit.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { userId, connection } = await requireShopContext(req);
    const body = (await req.json().catch(() => ({}))) as { productGid?: string };
    if (!body.productGid || !body.productGid.startsWith("gid://shopify/Product/")) {
      return NextResponse.json({ error: "productGid required" }, { status: 400 });
    }

    const spinId = await importProductCore(userId, connection, body.productGid);
    const payload = await startGeneration(userId, spinId);

    return NextResponse.json({ spinId, payload });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      console.error("[embedded] auth refused:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Import failed — try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
