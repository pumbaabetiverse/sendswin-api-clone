// src/deposits/deposits.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DepositsService } from '@/deposits/deposit.service';

@Injectable()
export class DepositsScheduler {
  private readonly logger = new Logger(DepositsScheduler.name);

  constructor(private readonly depositsService: DepositsService) {}

  // Run every 30 seconds
  @Cron('*/30 * * * * *')
  async fetchPayTradeHistory() {
    try {
      this.logger.debug('Running scheduled task to fetch pay trade history');
      await this.depositsService.processPayTradeHistory();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
