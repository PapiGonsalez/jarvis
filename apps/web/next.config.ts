import type { NextConfig } from "next";

const JARVIS_API = process.env.JARVIS_API_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/jarvis/:path*",
        destination: `${JARVIS_API}/:path*`,
      },
    ];
  },
};

export default nextConfig;
