import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { cpus: 1 },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "**.arweave.net" },
      { protocol: "https", hostname: "media.howrare.is" },
      { protocol: "https", hostname: "www.arweave.net" },
    ],
  },
  allowedDevOrigins: [
    "monke.bar",
    "*.trycloudflare.com",
    "*.metasal.xyz",
    "*.vercel.app",
  ],
};

export default nextConfig;
