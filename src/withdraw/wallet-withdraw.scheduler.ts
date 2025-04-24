import { Injectable, Logger } from '@nestjs/common';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WalletWithdrawScheduler {
  private readonly logger = new Logger(WalletWithdrawScheduler.name);

  constructor(private readonly withdrawService: WithdrawService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    waitForCompletion: true,
  })
  async syncWalletWithdrawBalance() {
    this.logger.debug('Running scheduled task to sync wallet withdraw balance');
    try {
      await this.withdrawService.syncWalletBalances();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
