import { Injectable } from "@nestjs/common";
import { prisma } from "@deacad/database";

// Dipanggil dari service lain (settings, documents, transactions) setiap ada aksi admin —
// jejak forensik wajib untuk semua toggle/approve/reject/refund (ARCHITECTURE.md #7 & #12).
@Injectable()
export class AuditLogsService {
  async record(params: {
    adminId: string;
    action: string;
    targetId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetId: params.targetId,
        oldValue: params.oldValue as never,
        newValue: params.newValue as never,
      },
    });
  }

  async listByTarget(targetId: string) {
    return prisma.auditLog.findMany({
      where: { targetId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listRecent(limit = 50) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { admin: { select: { name: true, email: true } } },
    });
  }
}
