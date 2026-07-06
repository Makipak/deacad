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
  return `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}

export async function uploadConvertedPdf(localPath: string, documentId: string): Promise<string> {
  const buffer = await readFile(localPath);
  const key = `converted/${documentId}.pdf`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "application/pdf" }),
  );
  return `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}
