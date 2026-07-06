import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import type { Request } from "express";
import { prisma } from "@deacad/database";
import { SettingsService } from "../../settings/settings.service.js";

// Implementasi persis alur ARCHITECTURE.md #5 bagian Download:
//   settings.downloadPaymentEnabled == false -> lolos langsung
//   true -> cek document_access (atau uploader = pemilik) -> lolos, kalau belum -> 403 PAYMENT_REQUIRED
@Injectable()
export class DownloadAccessGuard implements CanActivate {
  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const documentId = request.params.id;
    const userId = request.user?.id;

    if (!this.settingsService.get().downloadPaymentEnabled) return true;
    if (!userId) throw new ForbiddenException("PAYMENT_REQUIRED");

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (document?.userId === userId) return true; // uploader selalu boleh download dokumennya sendiri.

    const access = await prisma.documentAccess.findUnique({
      where: { userId_documentId: { userId, documentId } },
    });
    if (access) return true;

    // Kode "PAYMENT_REQUIRED" dibaca frontend untuk memicu modal bayar, bukan 403 generik.
    throw new ForbiddenException("PAYMENT_REQUIRED");
  }
}
