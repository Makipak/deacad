import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { prisma } from "@deacad/database";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

// Guard global (dipasang lewat APP_GUARD di app.module.ts) — DEFAULT MENOLAK semua request.
// Ini implementasi "fail-secure" dari ARCHITECTURE.md #7: endpoint baru otomatis ke-protect,
// developer harus SADAR menandai @Public() kalau memang mau endpoint terbuka.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Cek metadata @Public() di handler atau class — kalau ada, lolos tanpa cek token.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Token akses tidak ditemukan");
    }

    let payload: AuthenticatedUser;
    try {
      // Verifikasi signature + expiry access token.
      payload = this.jwtService.verify<AuthenticatedUser>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }

    // Cek status akun di DB (lookup by primary key, murah) — tanpa ini user yang baru di-ban tetap
    // bisa memakai access token lamanya sampai expired (default 15 menit). Role juga diambil dari DB,
    // bukan dari klaim token, supaya perubahan role langsung berlaku.
    const account = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { role: true, bannedAt: true },
    });
    if (!account) throw new UnauthorizedException("Akun tidak ditemukan");
    if (account.bannedAt) throw new ForbiddenException("Akun Anda telah diblokir oleh admin");

    // Tempel user ke request supaya bisa dipakai @CurrentUser() dan RolesGuard.
    request.user = { id: payload.id, role: account.role };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return undefined;
    return header.slice("Bearer ".length);
  }
}
