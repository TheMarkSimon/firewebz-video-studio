/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // Keep ffmpeg-related packages external so webpack doesn't try to bundle
    // the native binary or the installer's dynamic platform require(). Under
    // Next 15+ this moves to top-level `serverExternalPackages`.
    serverComponentsExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
    // In Next 14 this key lives under experimental — it sat at the top level
    // (silently IGNORED, hence the old build warning) until 2026-07-13, which
    // likely left ffmpeg untraced in some lambdas (flatten silently failing →
    // transparent references → hex-pattern hallucinations, lesson 11).
    outputFileTracingIncludes: {
      "/**": [
        "./node_modules/.prisma/client/**/*",
        "./node_modules/@prisma/client/**/*",
        "./node_modules/@ffmpeg-installer/**/*",
      ],
    },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Framing zones: /embed/* is iframed by merchant storefronts
  // (frame-ancestors *); /shopify/* is iframed by the Shopify admin (CSP set
  // per-request in middleware.ts — needs the shop domain); everything else
  // refuses framing (clickjacking). nosniff + referrer policy everywhere.
  // HSTS is added by Vercel automatically.
  async headers() {
    const baseline = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      {
        source: "/((?!embed|shopify).*)",
        headers: [...baseline, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/shopify/:path*",
        headers: baseline,
      },
      {
        source: "/embed/:path*",
        headers: [
          ...baseline,
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};
export default nextConfig;
