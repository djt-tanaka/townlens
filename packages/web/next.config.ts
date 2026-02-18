import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@townlens/core"],
  serverExternalPackages: ["axios"],
};

export default nextConfig;
