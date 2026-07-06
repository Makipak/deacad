import { Injectable, type OnModuleInit } from "@nestjs/common";
import { prisma } from "@deacad/database";
import type { MonetizationSettings } from "@deacad/shared-types";

const SETTINGS_KEY = "monetization";
const DEFAULT_SETTINGS: MonetizationSettings = {
  uploadPaymentEnabled: false,
  downloadPaymentEnabled: false,
  uploadPrice: 15_000,
  downloadPrice: 15_000,
};

// Cache in-memory, di-refresh saat startup & saat admin update (ARCHITECTURE.md #5).
// Catatan: untuk multi-instance production ini perlu dipindah ke Redis pub/sub supaya
// semua instance API dapat notifikasi saat satu instance lain meng-update settings.
@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: MonetizationSettings = DEFAULT_SETTINGS;

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  get(): MonetizationSettings {
    return this.cache;
  }

  async update(patch: Partial<MonetizationSettings>): Promise<MonetizationSettings> {
    const next = { ...this.cache, ...patch };
    await prisma.settings.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: next },
      create: { key: SETTINGS_KEY, value: next },
    });
    this.cache = next;
    return next;
  }

  private async refresh(): Promise<void> {
    const row = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } });
    this.cache = row ? (row.value as unknown as MonetizationSettings) : DEFAULT_SETTINGS;
  }
}
