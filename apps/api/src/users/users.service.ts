import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { UpdateProfileInput } from "@deacad/shared-types";
import { AuditLogsService } from "../audit-logs/audit-logs.service.js";

// select eksplisit — passwordHash TIDAK pernah ikut ke response (ARCHITECTURE.md #7, Mass Assignment).
const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
  university: true,
  studyProgram: true,
  studentId: true,
  phone: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  async findPublicProfile(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_PROFILE_SELECT });
    if (!user) throw new NotFoundException("User tidak ditemukan");
    return user;
  }

  // Simpan data diri (onboarding "Lengkapi Data Diri" maupun ubah profil di /profile). Field diambil eksplisit satu per satu
  // (bukan spread body) supaya role/email/dll tidak bisa ikut ditimpa — cegah mass assignment.
  async updateProfile(id: string, input: UpdateProfileInput) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        university: input.university,
        studyProgram: input.studyProgram,
        studentId: input.studentId,
        phone: input.phone,
      },
      select: PUBLIC_PROFILE_SELECT,
    });
  }

  // Dipakai admin panel — daftar user dengan info dasar, bukan untuk publik.
  async listForAdmin() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        university: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return users.map(({ _count, ...user }) => ({ ...user, documentCount: _count.documents }));
  }

  // Semua dokumen milik satu user (semua status) untuk menu Pengguna admin.
  async listDocuments(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException("User tidak ditemukan");
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileType: true,
        status: true,
        viewCount: true,
        downloadCount: true,
        originalFileUrl: true,
        createdAt: true,
      },
    });
  }

  // Blokir akun. Urutan penting: (1) tandai banned, (2) revoke SEMUA refresh token user dalam satu
  // transaksi — supaya tidak ada celah di antara dua langkah itu. Access token yang masih hidup
  // (<=15 menit) ditolak JwtAuthGuard karena guard mengecek banned_at tiap request.
  async ban(adminId: string, targetId: string, reason: string) {
    if (adminId === targetId) throw new BadRequestException("Tidak bisa memblokir akun sendiri");

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, bannedAt: true },
    });
    if (!target) throw new NotFoundException("User tidak ditemukan");
    // Admin tidak bisa memblokir admin lain (mencegah admin yang akunnya dibobol dipakai mengunci admin lain).
    if (target.role === "admin") throw new ForbiddenException("Akun admin tidak bisa diblokir");
    if (target.bannedAt) throw new ConflictException("User sudah diblokir");

    const bannedAt = new Date();
    const banned = await prisma.$transaction(async (tx) => {
      // where bannedAt:null = guard atomik kalau dua admin menekan Ban hampir bersamaan.
      const { count } = await tx.user.updateMany({
        where: { id: targetId, role: "user", bannedAt: null },
        data: { bannedAt, banReason: reason },
      });
      if (count === 0) return false;
      await tx.refreshToken.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: bannedAt },
      });
      return true;
    });
    if (!banned) throw new ConflictException("User sudah diblokir");

    await this.auditLogsService.record({
      adminId,
      action: "user.ban",
      targetId,
      oldValue: { bannedAt: null },
      newValue: { bannedAt, banReason: reason },
    });
    return { id: targetId, bannedAt, banReason: reason };
  }

  async unban(adminId: string, targetId: string) {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, bannedAt: true, banReason: true },
    });
    if (!target) throw new NotFoundException("User tidak ditemukan");
    if (!target.bannedAt) throw new ConflictException("User tidak sedang diblokir");

    await prisma.user.update({ where: { id: targetId }, data: { bannedAt: null, banReason: null } });

    await this.auditLogsService.record({
      adminId,
      action: "user.unban",
      targetId,
      oldValue: { bannedAt: target.bannedAt, banReason: target.banReason },
      newValue: { bannedAt: null },
    });
    return { id: targetId, bannedAt: null, banReason: null };
  }
}
