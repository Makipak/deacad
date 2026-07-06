import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

// Pengganti class-validator ValidationPipe global — project ini pakai Zod (shared-types) sebagai
// satu-satunya sumber shape data FE+BE, jadi validasi backend pakai schema yang sama.
// Skema di shared-types dibuat via z.object({...}) yang secara default STRIP field asing
// (setara whitelist: true di ValidationPipe NestJS) — field tak dikenal otomatis dibuang, bukan error,
// karena ini cocok untuk DTO input form. Field sensitif (role, dst) memang sengaja tidak pernah
// dimasukkan ke schema input (lihat ARCHITECTURE.md #7, Mass Assignment).
// Generic <T> supaya hasil transform() punya tipe yang benar di call-site (bukan `any`),
// jadi controller tidak perlu lagi cast manual "as never" ke tipe DTO.
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validasi input gagal",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
