import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { hash, compare } from "bcrypt";
import { prisma } from "@deacad/database";
import type { LoginInput, RegisterInput } from "@deacad/shared-types";
import { EmailService } from "./email.service.js";
import { generateOpaqueToken, hashToken } from "./token.util.js";
import type { AuthenticatedUser } from "../common/types/authenticated-user.js";

const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000; // 30 menit (ARCHITECTURE.md #8).
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari, selaras JWT_REFRESH_EXPIRES_IN.
const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(input: RegisterInput): Promise<{ message: string }> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Di sini boleh eksplisit conflict karena user memang sedang mencoba daftar (bukan endpoint yang rawan enumeration).
      throw new ConflictException("Email sudah terdaftar");
    }

    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });

    await this.issueEmailVerificationToken(user.id, user.email);
    return { message: "Registrasi berhasil, cek email untuk verifikasi" };
  }

  async login(input: LoginInput): Promise<TokenPair & { user: AuthenticatedUser }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Pesan generik sengaja sama baik email tidak ada maupun password salah — cegah email enumeration.
    const invalidCredentials = () => new UnauthorizedException("Email atau password salah");

    if (!user) throw invalidCredentials();
    const passwordMatches = await compare(input.password, user.passwordHash);
    if (!passwordMatches) throw invalidCredentials();

    const authUser: AuthenticatedUser = { id: user.id, role: user.role };
    const tokens = await this.issueTokenPair(authUser, randomUUID());
    return { ...tokens, user: authUser };
  }

  // Dipanggil endpoint /auth/refresh. Implementasi rotation + reuse detection (ARCHITECTURE.md #8):
  // token lama langsung revoked setelah dipakai; kalau token yang SUDAH revoked dipakai lagi
  // (indikasi dicuri & dipakai penyerang setelah pemilik asli rotate), seluruh family di-revoke.
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesi kedaluwarsa, silakan login ulang");
    }

    if (stored.revokedAt) {
      // Token yang sudah di-revoke dipakai lagi = reuse detection triggered.
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        "Terdeteksi penggunaan token tidak sah, semua sesi telah di-revoke",
      );
    }

    // Revoke token lama, terbitkan token baru di family yang sama.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const authUser: AuthenticatedUser = { id: user.id, role: user.role };
    return this.issueTokenPair(authUser, stored.familyId);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    // updateMany (bukan update) supaya tidak error kalau token sudah tidak ada/invalid — logout harus selalu "berhasil".
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Token verifikasi tidak valid atau kedaluwarsa");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      // Single-use — token dihapus setelah dipakai (ARCHITECTURE.md #8).
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    return { message: "Email berhasil diverifikasi" };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    // Response SAMA baik user ada maupun tidak — cegah email enumeration (ARCHITECTURE.md #8).
    // Rate limiting endpoint ini diatur lewat @Throttle() di controller, bukan di service.
    if (user && !user.emailVerified) {
      await this.issueEmailVerificationToken(user.id, user.email);
    }
    return { message: "Kalau email terdaftar, link verifikasi baru sudah dikirim" };
  }

  private async issueEmailVerificationToken(userId: string, email: string): Promise<void> {
    const rawToken = generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });
    const verifyUrl = `${process.env.CORS_ORIGIN}/verify-email?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(email, verifyUrl);
  }

  private async issueTokenPair(user: AuthenticatedUser, familyId: string): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(user, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as JwtSignOptions["expiresIn"],
    });

    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        familyId,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, refreshTokenExpiresAt };
  }
}
