import type { MetadataRoute } from "next";

// Public marketing surface is indexable. User-generated session/embed URLs
// contain a session id in the path and should never end up in search — that
// data is transient (24h TTL) and hitting a stale one returns "Session not
// found" which is a bad landing page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/onboarding", "/spin-demo"],
        disallow: ["/generate", "/embed/", "/api/"],
      },
    ],
    sitemap: "https://firewebz-video-studio.vercel.app/sitemap.xml",
  };
}
