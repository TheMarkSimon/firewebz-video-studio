/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  outputFileTracingIncludes: {
    "/**": ["./prisma/seed.db", "./node_modules/.prisma/client/**/*", "./node_modules/@prisma/client/**/*"],
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
