import type { MetadataRoute } from "next";

// Public marketing surface is indexable. App surfaces and per-spin embed
// URLs stay out of search — an embed is an iframe fragment, not a landing
// page, and /studio//shopify//admin are gated app UIs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/onboarding", "/spin-demo", "/help"],
        disallow: ["/generate", "/embed/", "/api/", "/studio", "/shopify/", "/admin"],
      },
    ],
    sitemap: "https://thespinr.com/sitemap.xml",
  };
}
