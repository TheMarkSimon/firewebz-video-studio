// Shopify webhooks — one endpoint for every topic, routed by header.
//
// Serves BOTH the mandatory compliance webhooks (configured in the Partner
// dashboard: customers/data_request, customers/redact, shop/redact — App
// Store review sends signed + unsigned probes and requires 401 on bad HMAC)
// AND the app-lifecycle topics we register via API at install time
// (app/uninstalled, app_subscriptions/update).
//
// HMAC: base64 SHA-256 of the RAW body with the app secret, from the
// X-Shopify-Hmac-Sha256 header. Verify before parsing anything.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyWebhookHmac(rawBody: string, header: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !header) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookHmac(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    // header-verified but unparseable body — acknowledge anyway
  }

  switch (topic) {
    case "app/uninstalled":
      // Token is dead the moment the app is uninstalled; drop the
      // connection (subscription auto-cancels on Shopify's side). The
      // merchant's Spinr account and spins are THEIRS and remain.
      if (shop) await prisma.shopifyConnection.deleteMany({ where: { shop } });
      break;

    case "app_subscriptions/update": {
      // Keep plan state truthful when merchants cancel/decline/resume
      // from the Shopify side.
      const gid: string | undefined = payload?.app_subscription?.admin_graphql_api_id;
      const status: string | undefined = payload?.app_subscription?.status;
      if (gid && status) {
        await prisma.shopifyConnection.updateMany({
          where: { subscriptionGid: gid },
          data: {
            subscriptionStatus: String(status).toUpperCase(),
            subscriptionUpdatedAt: new Date(),
          },
        });
      }
      break;
    }

    case "customers/data_request":
    case "customers/redact":
      // Spinr never requests, reads, or stores shopper/customer data —
      // scopes are read_products/write_products only, and the DB holds no
      // customer records. Nothing to export or erase; acknowledging is
      // the compliant response.
      break;

    case "shop/redact":
      // Sent ~48h after uninstall: erase what we hold about the SHOP.
      if (shop) await prisma.shopifyConnection.deleteMany({ where: { shop } });
      break;

    default:
      // Unknown topic — acknowledge so Shopify doesn't retry forever.
      break;
  }

  return NextResponse.json({ ok: true });
}
