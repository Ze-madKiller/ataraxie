import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browsers and crawlers still ask for /favicon.ico; serve the SVG icon instead of a 404.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
