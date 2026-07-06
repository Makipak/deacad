// midtrans-client tidak menyediakan definisi TypeScript resmi — shim minimal ini cuma
// mendeskripsikan bagian SDK yang benar-benar dipakai (MidtransService), bukan API penuh.
declare module "midtrans-client" {
  interface SnapTransactionParams {
    transaction_details: { order_id: string; gross_amount: number };
    customer_details?: { email?: string; first_name?: string };
    item_details?: Array<{ id: string; price: number; quantity: number; name: string }>;
  }

  interface SnapTransactionResult {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(config: { isProduction: boolean; serverKey?: string; clientKey?: string });
    createTransaction(params: SnapTransactionParams): Promise<SnapTransactionResult>;
  }

  class CoreApi {
    constructor(config: { isProduction: boolean; serverKey?: string; clientKey?: string });
    transaction: {
      status(orderId: string): Promise<{ transaction_status: string; [key: string]: unknown }>;
    };
  }

  const midtransClient: { Snap: typeof Snap; CoreApi: typeof CoreApi };
  export default midtransClient;
}
