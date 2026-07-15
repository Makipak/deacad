import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { TransactionsModule } from "./transactions/transactions.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { AuditLogsModule } from "./audit-logs/audit-logs.module.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";

@Module({
  imports: [
    // .env root sudah dimuat lebih awal lewat "./load-env.js" (di-import paling pertama di main.ts,
    // sebelum modul lain yang baca process.env saat di-import, mis. @deacad/database). Ini cuma
    // mendaftarkan ConfigModule secara global untuk siapa pun yang nanti mau pakai ConfigService.
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limit global default — endpoint sensitif override lebih ketat lewat @Throttle() (ARCHITECTURE.md #7).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // JwtModule global (dipakai JwtAuthGuard) — register({}) supaya secret dipilih eksplisit per pemakaian.
    JwtModule.register({ global: true }),
    AuthModule,
    UsersModule,
    DocumentsModule,
    TransactionsModule,
    SettingsModule,
    ReportsModule,
    CategoriesModule,
    AuditLogsModule,
  ],
  providers: [
    // Guard rate-limit dipasang global.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Guard auth dipasang global DAN PALING TERAKHIR didaftarkan supaya jalan setelah throttler
    // — endpoint baru otomatis ke-protect (fail-secure), kecuali ditandai @Public() (ARCHITECTURE.md #7).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
