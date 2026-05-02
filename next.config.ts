import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle under .next/standalone for
  // Docker multi-stage runtime. See Dockerfile and #7 for context.
  output: "standalone",
};

export default nextConfig;
