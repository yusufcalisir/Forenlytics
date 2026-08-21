import type { NextConfig } from "next";
import path from "path";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "127.0.0.1:3077",
    "localhost:3077",
    "127.0.0.1:3000",
    "localhost:3000",
  ],
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;

