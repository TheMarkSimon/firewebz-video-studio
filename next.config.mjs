/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  outputFileTracingIncludes: {
    "/**": [
      "./prisma/seed.db",
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
      // ffmpeg binary needs to be traced into the serverless bundle;
      // Next won't detect it because we load it via dynamic import path.
      "./node_modules/@ffmpeg-installer/**/*",
    ],
  },
  // Keep ffmpeg-related packages external so Next doesn't try to bundle
  // the native binary through webpack (it'd choke on the ELF file).
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
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
