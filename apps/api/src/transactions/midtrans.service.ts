import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import midtransClient from "midtrans-client";

// Wrapper tipis di atas SDK resmi midtrans-client — supaya seluruh app tidak import SDK vendor langsung.
@Injectable()
export class MidtransService {
  private readonly snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });

  private readonly coreApi = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });

  async createSnapToken(params: {
    orderId: string;
    amount: number;
    customerEmail: string;
    itemName: string;
  }): Promise<{ token: string; redirectUrl: string }> {
    const result = await this.snap.createTransaction({
      transaction_details: { order_id: params.orderId, gross_amount: params.amount },
      customer_details: { email: params.customerEmail },
      item_details: [{ id: params.orderId, price: params.amount, quantity: 1, name: params.itemName }],
    });
    return { token: result.token, redirectUrl: result.redirect_url };
  }

  // Dipakai reconciliation cron — polling aktif ke Midtrans, jangan cuma pasif nunggu webhook (ARCHITECTURE.md #9).
  async getStatus(orderId: string) {
    return this.coreApi.transaction.status(orderId);
  }

  // Verifikasi signature webhook — SESUAI SPESIFIKASI MIDTRANS: SHA512(order_id+status_code+gross_amount+server_key).
  // Dilakukan PALING AWAL sebelum query database apa pun (ARCHITECTURE.md #9, Webhook endpoint sebagai target spam).
  verifySignature(params: {
    orderId: string;
    statusCode: string;
    grossAmount: string;
    signatureKey: string;
  }): boolean {
    const expected = createHash("sha512")
      .update(
        `${params.orderId}${params.statusCode}${params.grossAmount}${process.env.MIDTRANS_SERVER_KEY}`,
      )
      .digest("hex");
    return expected === params.signatureKey;
  }
}
