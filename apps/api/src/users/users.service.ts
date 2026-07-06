import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";

@Injectable()
export class UsersService {
  async findPublicProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      // select eksplisit — passwordHash TIDAK pernah ikut ke response (ARCHITECTURE.md #7, Mass Assignment).
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("User tidak ditemukan");
    return user;
  }

  // Dipakai admin panel — daftar user dengan info dasar, bukan untuk publik.
  async listForAdmin() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
