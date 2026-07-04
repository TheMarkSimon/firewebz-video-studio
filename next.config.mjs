/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  outputFileTracingIncludes: {
    "/**": ["./prisma/seed.db", "./node_modules/.prisma/client/**/*", "./node_modules/@prisma/client/**/*"],
  },
};
export default nextConfig;
