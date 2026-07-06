import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { CreateCategoryInput } from "@deacad/shared-types";

@Injectable()
export class CategoriesService {
  list() {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  async create(input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictException("Kategori dengan nama ini sudah ada");
    return prisma.category.create({ data: { name: input.name } });
  }

  // Hapus kategori yang masih dipakai dokumen sebaiknya diblok, bukan hard-delete (ARCHITECTURE.md #12).
  async remove(id: string): Promise<void> {
    const usageCount = await prisma.document.count({ where: { categoryId: id } });
    if (usageCount > 0) {
      throw new ConflictException(
        `Kategori masih dipakai ${usageCount} dokumen, tidak bisa dihapus`,
      );
    }
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Kategori tidak ditemukan");
    await prisma.category.delete({ where: { id } });
  }
}
