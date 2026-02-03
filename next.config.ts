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
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api-tms/:path*",
  //       destination: "https://odoodev.linitekno.com/api-tms/:path*",
  //     },
  //   ];
  // },
};
export default nextConfig;
