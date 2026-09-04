import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
});

const bucket = process.env.STORAGE_BUCKET ?? "deacad";
// STORAGE_ENDPOINT dipakai client S3 buat konek (bisa hostname internal Docker, mis. "storage:9000").
// STORAGE_PUBLIC_ENDPOINT dipakai buat URL yang disimpan ke DB & dibuka browser — kalau worker jalan
// di container terpisah dari browser (mis. lewat docker-compose di dev), dua alamat ini beda.
// Pakai || (bukan ??) — nilai "" di .env harus ikut fallback ke STORAGE_ENDPOINT.
const publicEndpoint = process.env.STORAGE_PUBLIC_ENDPOINT || process.env.STORAGE_ENDPOINT;

export async function downloadOriginal(fileUrl: string, destPath: string): Promise<void> {
  // fileUrl hasil StorageService.upload() berbentuk "{endpoint}/{bucket}/{key}" — ambil key-nya saja.
  const key = fileUrl.split(`/${bucket}/`)[1];
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = Buffer.from(await result.Body!.transformToByteArray());
  await writeFile(destPath, buffer);
}

export async function uploadPageImage(localPath: string, documentId: string): Promise<string> {
  const buffer = await readFile(localPath);
  const key = `pages/${documentId}/${randomUUID()}.png`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "image/png" }),
  );
  return `${publicEndpoint}/${bucket}/${key}`;
}

export async function uploadThumbnail(localPath: string, documentId: string): Promise<string> {
  const buffer = await readFile(localPath);
  // Key tetap per dokumen (bukan randomUUID) — re-convert menimpa thumbnail lama, tidak menumpuk.
  const key = `thumbnails/${documentId}.png`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "image/png" }),
  );
  return `${publicEndpoint}/${bucket}/${key}`;
}

export async function uploadConvertedPdf(localPath: string, documentId: string): Promise<string> {
  const buffer = await readFile(localPath);
  const key = `converted/${documentId}.pdf`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "application/pdf" }),
  );
  return `${publicEndpoint}/${bucket}/${key}`;
}
