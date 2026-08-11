import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/auth/**": ["./src/resources/templates/**"],
  },
};

export default nextConfig;
