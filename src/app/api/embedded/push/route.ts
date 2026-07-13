// Embedded: push a ready spin to its product (custom.spinr_id metafield).

import { NextRequest, NextResponse } from "next/server";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { pushSpinCore } from "@/lib/shopify-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireShopContext(req);
    const body = (await req.json().catch(() => ({}))) as { spinId?: string };
    if (!body.spinId) return NextResponse.json({ error: "spinId required" }, { status: 400 });

    const result = await pushSpinCore(userId, body.spinId);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      console.error("[embedded] auth refused:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[embedded/push]", err);
    return NextResponse.json({ error: "Push failed — try again." }, { status: 500 });
  }
}
