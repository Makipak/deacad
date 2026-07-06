import { Injectable, Logger } from "@nestjs/common";

// Wrapper tipis ke transactional email provider (Resend/SendGrid/SES — ARCHITECTURE.md #8).
// VPS sengaja TIDAK kirim SMTP langsung karena rawan masuk spam (IP belum reputable, SPF/DKIM/DMARC manual).
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY;

    // Tanpa API key (dev/demo lokal) — jangan gagal, cukup log link ke console supaya tetap bisa ditest manual.
    if (!apiKey) {
      this.logger.warn(
        `EMAIL_PROVIDER_API_KEY belum diisi — link verifikasi untuk ${to}: ${verifyUrl}`,
      );
      return;
    }

    // Contoh call ke Resend API — ganti endpoint/body kalau pakai provider lain.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@deacad.example",
        to,
        subject: "Verifikasi email Deacad",
        html: `<p>Klik link berikut untuk verifikasi email (berlaku 30 menit): <a href="${verifyUrl}">${verifyUrl}</a></p>`,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Gagal kirim email verifikasi ke ${to}: HTTP ${response.status}`);
    }
  }
}
