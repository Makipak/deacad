import "./load-env.js"; // wajib paling awal — muat .env sebelum modul lain baca process.env saat di-import.
import "reflect-metadata"; // wajib di-import paling awal — dipakai decorator metadata NestJS.
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security header (CSP, X-Frame-Options, dst) — ARCHITECTURE.md #7 bagian Security Headers.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Izinkan gambar slide dari storage & iframe Snap Midtrans, tolak sumber lain.
          imgSrc: ["'self'", "data:", process.env.STORAGE_ENDPOINT ?? "'self'"],
          frameSrc: ["'self'", "https://app.sandbox.midtrans.com", "https://app.midtrans.com"],
          frameAncestors: ["'none'"], // cegah clickjacking — situs lain tidak boleh nge-iframe API ini.
        },
      },
    }),
  );

  // Refresh token dikirim sebagai httpOnly cookie (ARCHITECTURE.md #8) — perlu parser ini untuk membacanya.
  app.use(cookieParser());

  // CORS di-whitelist eksplisit, bukan "*", karena credentials (cookie) ikut dikirim.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // Prefix global supaya path API konsisten: /api/v1/...
  app.setGlobalPrefix("api/v1");

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Deacad API jalan di http://localhost:${port}/api/v1`);
}

bootstrap();
