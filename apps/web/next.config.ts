import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages
  output: isProduction ? "export" : undefined,
  // Serwist uses webpack internally, so we need --webpack for build
  turbopack: {},
  // Rewrites only work in dev (not in static export)
  ...(!isProduction && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:4000/api/:path*",
        },
      ];
    },
  }),
};

export default withSerwist(nextConfig);
