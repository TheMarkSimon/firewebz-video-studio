/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // Keep ffmpeg-related packages external so webpack doesn't try to bundle
    // the native binary or the installer's dynamic platform require(). Under
    // Next 15+ this moves to top-level `serverExternalPackages`.
    serverComponentsExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  outputFileTracingIncludes: {
    "/**": [
            "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
      // ffmpeg binary needs to be traced into the serverless bundle;
      // Next won't detect it because we load it via dynamic import path.
      "./node_modules/@ffmpeg-installer/**/*",
    ],
  },
  // /embed/* is meant to be iframed by merchant storefronts (frame-ancestors
  // *); everything else refuses framing (clickjacking). nosniff + referrer
  // policy everywhere. HSTS is added by Vercel automatically.
  async headers() {
    const baseline = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      {
        source: "/((?!embed).*)",
        headers: [...baseline, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
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
