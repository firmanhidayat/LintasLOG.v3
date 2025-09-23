import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath: "/tms",
  // basePath: "/lini_translog/static/frontend",
  // assetPrefix: "/lini_translog/static/frontend",
  assetPrefix: "/tms",
  trailingSlash: true,
};
export default nextConfig;
