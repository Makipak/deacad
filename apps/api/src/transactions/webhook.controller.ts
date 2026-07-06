import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { midtransWebhookSchema } from "@deacad/shared-types";
import { Public } from "../common/decorators/public.decorator.js";
import { MidtransService } from "./midtrans.service.js";
import { TransactionsService } from "./transactions.service.js";

// Controller terpisah dari TransactionsController — webhook punya karakteristik beda total
// (dipanggil Midtrans, bukan user login, dan endpoint ini jadi target spam populer).
@Controller("webhooks/midtrans")
export class WebhookController {
  constructor(
    private readonly midtransService: MidtransService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } }) // tetap dibatasi meski dari Midtrans (ARCHITECTURE.md #9).
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() rawBody: unknown) {
    const payload = midtransWebhookSchema.parse(rawBody);

    // Verifikasi signature PALING AWAL, sebelum query database apa pun (ARCHITECTURE.md #9).
    const isValid = this.midtransService.verifySignature({
      orderId: payload.order_id,
      statusCode: payload.status_code,
      grossAmount: payload.gross_amount,
      signatureKey: payload.signature_key,
    });
    if (!isValid) {
      throw new BadRequestException("Signature tidak valid");
    }

    await this.transactionsService.syncStatus(
      payload.order_id,
      payload.transaction_status,
      payload.gross_amount,
    );

    // Selalu return HTTP 200 meski transaksi sudah diproses sebelumnya, supaya retry Midtrans berhenti
    // (ARCHITECTURE.md #9, Webhook idempotency).
    return { message: "OK" };
  }
}
