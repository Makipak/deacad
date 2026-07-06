import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";

// Object storage S3-compatible (MinIO lokal, atau S3/R2 di production — tinggal ganti STORAGE_ENDPOINT).
@Injectable()
export class StorageService {
  private readonly client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    forcePathStyle: true, // wajib true untuk MinIO (path-style, bukan virtual-hosted-style).
    region: "us-east-1", // MinIO tidak peduli region asli, tapi SDK tetap butuh nilai valid.
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
  });

  private readonly bucket = process.env.STORAGE_BUCKET ?? "deacad";

  async upload(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
    // Nama file di-generate ulang pakai UUID — TIDAK PERNAH pakai nama asli dari user,
    // supaya path traversal / nama file berbahaya tidak bisa menembus storage (ARCHITECTURE.md #7).
    const key = `originals/${randomUUID()}${extname(originalName)}`;

    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };
    await this.client.send(new PutObjectCommand(params));

    return `${process.env.STORAGE_ENDPOINT}/${this.bucket}/${key}`;
  }
}
