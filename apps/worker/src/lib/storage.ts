import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { PermanentJobError } from "../errors.js";

// Konfigurasi storage di sini HARUS sinkron dengan apps/api/src/common/storage/storage.service.ts
// (dua deployable terpisah, sengaja tidak berbagi kode — pola yang sama dengan ConvertJobData).
const bucket = process.env.STORAGE_BUCKET ?? "deacad";

const client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  region: process.env.STORAGE_REGION || "us-east-1", // Backblaze B2 wajib sesuai endpoint, mis. "us-west-004"; R2 "auto".
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  // B2/R2 tidak selalu menerima checksum CRC32 default AWS SDK v3 baru — hanya kirim kalau operasi mewajibkan.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// Basis URL publik objek (tanpa trailing slash) yang DISIMPAN ke DB & dibuka browser:
//  1. STORAGE_PUBLIC_BASE_URL — URL lengkap, mis. B2 "https://f004.backblazeb2.com/file/<bucket>", R2 "https://pub-xxxx.r2.dev".
//  2. {STORAGE_PUBLIC_ENDPOINT || STORAGE_ENDPOINT}/{bucket} — pola MinIO/ngrok seperti sebelumnya.
// STORAGE_ENDPOINT dipakai client S3 buat konek (bisa hostname internal Docker, mis. "storage:9000").
// Pakai || (bukan ??) — nilai "" di .env harus ikut fallback.
const publicBase = (
  process.env.STORAGE_PUBLIC_BASE_URL?.trim() ||
  `${process.env.STORAGE_PUBLIC_ENDPOINT || process.env.STORAGE_ENDPOINT}/${bucket}`
).replace(/\/+$/, "");

// URL publik -> key objek. URL yang diawali basis publik saat ini dipakai langsung; URL lama (mis. dari
// MinIO/ngrok sebelum pindah storage) jatuh ke pola "{apa pun}/{bucket}/{key}".
function keyFromUrl(fileUrl: string): string | null {
  if (fileUrl.startsWith(`${publicBase}/`)) return fileUrl.slice(publicBase.length + 1);
  const legacy = fileUrl.split(`/${bucket}/`)[1];
  return legacy || null;
}

export async function downloadOriginal(fileUrl: string, destPath: string): Promise<void> {
  const key = keyFromUrl(fileUrl);
  if (!key) throw new PermanentJobError("URL file asli tidak dikenali oleh konfigurasi storage saat ini");
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  // Stream langsung ke disk — file 50 MB tidak perlu ditahan dua kali di memori (Body -> byte array -> Buffer).
  await pipeline(result.Body as Readable, createWriteStream(destPath));
}

async function putFile(
  localPath: string,
  key: string,
  contentType: string,
  cacheControl?: string,
): Promise<string> {
  const body = await readFile(localPath);
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }),
  );
  return `${publicBase}/${key}`;
}

export async function uploadPageImage(localPath: string, documentId: string): Promise<string> {
  // Key berisi UUID acak dan tidak pernah ditimpa -> aman di-cache browser selamanya (hemat egress storage gratis).
  const key = `pages/${documentId}/${randomUUID()}.png`;
  return putFile(localPath, key, "image/png", "public, max-age=31536000, immutable");
}

export async function uploadThumbnail(localPath: string, documentId: string): Promise<string> {
  // Key tetap per dokumen (bukan randomUUID) — re-convert menimpa thumbnail lama, tidak menumpuk;
  // karena itu cache-nya dibatasi sehari, bukan selamanya.
  const key = `thumbnails/${documentId}.png`;
  return putFile(localPath, key, "image/png", "public, max-age=86400");
}

export async function uploadConvertedPdf(localPath: string, documentId: string): Promise<string> {
  const key = `converted/${documentId}.pdf`;
  return putFile(localPath, key, "application/pdf");
}
