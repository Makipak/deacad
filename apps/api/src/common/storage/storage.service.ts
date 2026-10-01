import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";

// Object storage S3-compatible: MinIO (lokal/VPS), Backblaze B2 atau Cloudflare R2 (shared hosting) —
// semuanya cukup lewat env, tanpa ubah kode (STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_PUBLIC_BASE_URL).
@Injectable()
export class StorageService {
  private readonly bucket = process.env.STORAGE_BUCKET ?? "deacad";

  private readonly client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    forcePathStyle: true, // wajib true untuk MinIO (path-style, bukan virtual-hosted-style); B2 & R2 juga mendukung.
    // MinIO tidak peduli region; Backblaze B2 WAJIB sesuai endpoint-nya (mis. "us-west-004"); R2 pakai "auto".
    region: process.env.STORAGE_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
    // AWS SDK v3 baru mengirim checksum CRC32 di setiap request secara default; Backblaze B2 dan Cloudflare R2
    // (juga MinIO lama) tidak selalu menerimanya. "WHEN_REQUIRED" = hanya kalau operasi memang mewajibkan.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  // Basis URL publik objek (tanpa trailing slash) — yang DISIMPAN ke DB & dibuka browser; key objek
  // ditambahkan di belakangnya. Urutan prioritas:
  //  1. STORAGE_PUBLIC_BASE_URL — URL lengkap termasuk bucket/prefix kalau provider-nya butuh, mis.
  //     B2: "https://f004.backblazeb2.com/file/<bucket>", R2: "https://pub-xxxx.r2.dev".
  //  2. {STORAGE_PUBLIC_ENDPOINT || STORAGE_ENDPOINT}/{bucket} — pola MinIO/ngrok seperti sebelumnya.
  // Pakai || (bukan ??) — nilai "" di .env harus ikut fallback, pola yang sama dengan EMAIL_PROVIDER_API_KEY (CLAUDE.md).
  private readonly publicBase = (
    process.env.STORAGE_PUBLIC_BASE_URL?.trim() ||
    `${process.env.STORAGE_PUBLIC_ENDPOINT || process.env.STORAGE_ENDPOINT}/${this.bucket}`
  ).replace(/\/+$/, "");

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

    return `${this.publicBase}/${key}`;
  }

  // Hapus objek berdasarkan URL publik yang tersimpan di DB. Hanya URL di bawah basis publik storage ini
  // yang disentuh (URL lain diabaikan) — jadi nilai aneh di kolom DB tidak bisa dipakai menghapus objek sembarangan.
  async deleteByUrls(urls: Array<string | null | undefined>): Promise<void> {
    const prefix = `${this.publicBase}/`;
    const keys = [
      ...new Set(urls.filter((u): u is string => !!u && u.startsWith(prefix)).map((u) => u.slice(prefix.length))),
    ];
    // DeleteObjects maksimal 1000 key per request.
    for (let i = 0; i < keys.length; i += 1000) {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
}
