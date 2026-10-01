import { timingSafeEqual } from "node:crypto";
import { Controller, Headers, HttpCode, HttpStatus, NotFoundException, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator.js";
import { ReconciliationCron } from "./reconciliation.cron.js";

// Pemicu reconciliation dari luar — untuk shared hosting, di mana proses Node (Passenger) bisa dimatikan saat
// idle sehingga @Cron in-process tidak bisa diandalkan. Cron Jobs cPanel memanggil endpoint ini tiap 5 menit:
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://api.domain/api/v1/internal/cron/reconcile
// Tanpa CRON_SECRET di env, endpoint ini mati (selalu 404). @Cron in-process tetap jalan di VPS/Docker.
@Controller("internal/cron")
export class CronController {
  constructor(private readonly reconciliationCron: ReconciliationCron) {}

  @Public() // diamankan secret sendiri, bukan JWT user.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("reconcile")
  @HttpCode(HttpStatus.OK)
  async reconcile(@Headers("x-cron-secret") provided?: string) {
    const expected = process.env.CRON_SECRET;
    if (!expected || !provided || !secretsMatch(provided, expected)) {
      // 404 (bukan 401/403) — jangan membocorkan bahwa endpoint ini ada.
      throw new NotFoundException();
    }
    await this.reconciliationCron.reconcilePendingTransactions();
    return { message: "OK" };
  }
}

// Perbandingan constant-time; panjang beda -> langsung false (timingSafeEqual melempar error kalau panjang beda).
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
