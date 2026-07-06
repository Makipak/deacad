import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { CreateReportInput } from "@deacad/shared-types";

@Injectable()
export class ReportsService {
  create(reporterId: string, input: CreateReportInput) {
    return prisma.report.create({
      data: { reporterId, documentId: input.documentId, reason: input.reason },
    });
  }

  // Antrian moderasi: status pending, urut terlama dulu (ARCHITECTURE.md #12).
  listPending() {
    return prisma.report.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        document: { select: { id: true, title: true } },
        reporter: { select: { name: true, email: true } },
      },
    });
  }

  async resolve(id: string, status: "resolved" | "dismissed") {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Laporan tidak ditemukan");
    return prisma.report.update({ where: { id }, data: { status } });
  }
}
