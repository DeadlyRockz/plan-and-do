import type { NextConfig } from "next";
import { securityHeaders } from "./src/server/security-headers";

const nextConfig: NextConfig = {
  // cacheComponents stays off: nonce-based CSP needs every page rendered per request, which
  // Partial Prerendering cannot do. See docs/adr/0001-tech-stack.md.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders(process.env.NODE_ENV === "production") }];
  },
};

export default nextConfig;
