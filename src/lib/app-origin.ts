// The app's canonical public origin, server-side.
//
// Used to build the fal webhook callback URL and links inside notification
// emails. Prefers NEXTAUTH_URL (already set everywhere — https://thespinr.com
// in prod, http://localhost:3000 locally), falls back to the Vercel-provided
// production domain.

export function getAppOrigin(): string | null {
  const url =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);
  return url ? url.replace(/\/$/, "") : null;
}

// Webhooks only work when fal can reach us — i.e. a public https origin.
export function isPublicOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return origin.startsWith("https://") && !origin.includes("localhost");
}
