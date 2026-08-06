import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/api", "@repo/auth", "@repo/db", "@repo/shared", "@repo/ui", "@repo/validation"],
};

export default nextConfig;
