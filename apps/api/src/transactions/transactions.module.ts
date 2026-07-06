import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SettingsModule } from "../settings/settings.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { TransactionsController } from "./transactions.controller.js";
import { WebhookController } from "./webhook.controller.js";
import { TransactionsService } from "./transactions.service.js";
import { MidtransService } from "./midtrans.service.js";
import { ReconciliationCron } from "./reconciliation.cron.js";

@Module({
  imports: [SettingsModule, QueueModule, ScheduleModule.forRoot()],
  controllers: [TransactionsController, WebhookController],
  providers: [TransactionsService, MidtransService, ReconciliationCron],
})
export class TransactionsModule {}
