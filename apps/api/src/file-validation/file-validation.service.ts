import { BadRequestException, Injectable } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB.

const PDF_MIME = "application/pdf";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// PPTX hanya diterima kalau ALLOW_PPTX_UPLOAD=true — konversinya butuh LibreOffice di mesin worker,
// yang tidak ada di shared hosting (mode default: PDF saja; user mengekspor PPT ke PDF sendiri).
// Di VPS/Docker (worker.Dockerfile sudah memasang LibreOffice) env ini bisa dinyalakan.
// Pasangannya di frontend: NEXT_PUBLIC_ALLOW_PPTX (teks & filter file di halaman upload).
function pptxAllowed(): boolean {
  return process.env.ALLOW_PPTX_UPLOAD === "true";
}

// Diisolasi jadi service sendiri (bukan inline di documents.service) supaya gampang
// ditambah ClamAV scan nanti tanpa mengubah call-site (ARCHITECTURE.md #7, File Upload).
@Injectable()
export class FileValidationService {
  async validate(file: Express.Multer.File): Promise<"pdf" | "pptx"> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("Ukuran file melebihi batas 50MB");
    }

    // Deteksi tipe dari MAGIC BYTES isi file, BUKAN dari ekstensi/mimetype yang diklaim client
    // (ekstensi gampang dipalsukan — ARCHITECTURE.md #7).
    const detected = await fileTypeFromBuffer(file.buffer);
    const mappedType =
      detected?.mime === PDF_MIME ? "pdf" : detected?.mime === PPTX_MIME && pptxAllowed() ? "pptx" : undefined;

    if (!mappedType) {
      throw new BadRequestException(
        pptxAllowed()
          ? "File harus berformat PDF atau PPTX yang valid"
          : "File harus berformat PDF yang valid. Punya file PPT? Ekspor dulu ke PDF (File → Save As → PDF).",
      );
    }

    // ClamAV scan ditunda untuk MVP (ARCHITECTURE.md #7) — titik ekstensi ada di sini kalau nanti ditambah:
    // await this.clamAvScan(file.buffer);

    return mappedType;
  }
}
