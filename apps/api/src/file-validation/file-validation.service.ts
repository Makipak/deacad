import { BadRequestException, Injectable } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB.

// Mapping mime hasil deteksi magic bytes -> tipe file internal kita.
const ALLOWED_MIME_TO_TYPE: Record<string, "pdf" | "pptx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

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
    const mappedType = detected ? ALLOWED_MIME_TO_TYPE[detected.mime] : undefined;

    if (!mappedType) {
      throw new BadRequestException("File harus berformat PDF atau PPTX yang valid");
    }

    // ClamAV scan ditunda untuk MVP (ARCHITECTURE.md #7) — titik ekstensi ada di sini kalau nanti ditambah:
    // await this.clamAvScan(file.buffer);

    return mappedType;
  }
}
