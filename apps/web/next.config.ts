import type { NextConfig } from "next";
import { securityHeaders as securityHeaders_ } from "./src/lib/security-headers";

const securityHeaders = securityHeaders_();

const nextConfig: NextConfig = {
  transpilePackages: ["@halftime/law", "@halftime/reader", "@halftime/mcp"],
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: { BUILD_DATE: new Date().toISOString().slice(0, 10) },
  webpack(config) {
    // Workspace packages use ESM-style ".js" specifiers for their ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"], ".mjs": [".mts", ".mjs"] };
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }
    ];
  }
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
