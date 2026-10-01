import type { NextConfig } from "next";

// Host gambar slide (S3-compatible: B2/R2/MinIO) diturunkan dari env supaya tidak hardcode.
// Prioritas: STORAGE_PUBLIC_BASE_URL → STORAGE_PUBLIC_ENDPOINT → STORAGE_ENDPOINT → MinIO lokal.
function storagePattern() {
  const raw =
    process.env.STORAGE_PUBLIC_BASE_URL ||
    process.env.STORAGE_PUBLIC_ENDPOINT ||
    process.env.STORAGE_ENDPOINT ||
    "http://localhost:9000";
  try {
    const u = new URL(raw);
    return {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    };
  } catch {
    return { protocol: "http" as const, hostname: "localhost", port: "9000" };
  }
}

const nextConfig: NextConfig = {
  // "standalone" → output kecil (.next/standalone/server.js) yang gampang di-upload ke shared hosting.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    remotePatterns: [storagePattern()],
  },
};

export default nextConfig;
