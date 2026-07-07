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
  // /embed/* is meant to be iframed by merchant storefronts. Override the
  // default X-Frame-Options: SAMEORIGIN so third-party pages can embed us.
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};
export default nextConfig;
