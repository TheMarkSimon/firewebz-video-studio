import { NextRequest } from "next/server";

// Proxy remote asset URLs through our own domain so client browsers on
// restrictive corporate networks (Zscaler etc.) can reach them.
//
// Only allowlisted hostnames are proxied — never open-ended forwarding.
// The Vercel server pulls the file from the remote CDN and streams it to
// the browser, so from the browser's point of view it's just fetching
// from our own origin.

const ALLOWED_HOSTS = new Set([
  "replicate.delivery",
  "pbxt.replicate.delivery",
  "tjzk.replicate.delivery",
  "dnznrvs05pmza.cloudfront.net", // Runway output CDN
  "fal.media",
  "v3b.fal.media",
  "v3.fal.media",
  "cdn.shopify.com", // product images for the catalog import grid
]);

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("Missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  const host = parsed.hostname.toLowerCase();
  const hostAllowed =
    ALLOWED_HOSTS.has(host) ||
    host.endsWith(".replicate.delivery") ||
    host.endsWith(".cloudfront.net") ||
    host.endsWith(".fal.media") ||
    host.endsWith(".fal.run") ||
    // Shopify serves product media from a couple of CDN domains.
    host.endsWith(".cdn.shopify.com") ||
    host.endsWith(".shopifycdn.net") ||
    host.endsWith(".shopifycdn.com") ||
    // Our own R2 media bucket (spin videos + frames).
    host.endsWith(".r2.dev");
  if (!hostAllowed) {
    return new Response(`Host not allowed: ${host}`, { status: 403 });
  }
  if (parsed.protocol !== "https:") {
    return new Response("Only https URLs are proxied", { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    // Pass through Range for streaming video, etc.
    headers: req.headers.get("range") ? { Range: req.headers.get("range")! } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges") ?? "bytes";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);
  headers.set("Accept-Ranges", acceptRanges);
  // fal.media URLs are content-addressed and immutable. Cache aggressively
  // so frame flipbooks don't re-fetch every scrub.
  headers.set("Cache-Control", "public, max-age=86400, immutable");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
