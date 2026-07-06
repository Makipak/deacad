import type { NextConfig } from "next";

// Next.js 16 — Turbopack jadi default builder (dev & build), tidak perlu flag tambahan.
const nextConfig: NextConfig = {
  images: {
    // Domain gambar slide hasil convert (MinIO/S3) — ganti sesuai STORAGE_ENDPOINT saat production.
    remotePatterns: [{ protocol: "http", hostname: "localhost", port: "9000" }],
  },
};

export default nextConfig;
