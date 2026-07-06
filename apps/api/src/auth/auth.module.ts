import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { EmailService } from "./email.service.js";

// JwtService sudah tersedia global lewat JwtModule.register({ global: true }) di AppModule —
// tidak perlu import JwtModule lagi di sini. Secret access/refresh tetap dipilih eksplisit
// per pemakaian (lihat AuthService & JwtAuthGuard), bukan dari default global, supaya dua
// jenis token tidak bisa saling dipakai silang.
@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
