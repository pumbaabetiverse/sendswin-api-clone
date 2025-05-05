// src/deposits/deposits.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { DepositsService } from '@/deposits/deposit.service';
import { BinanceService } from '@/binance/binance.service';
import { BinanceAccount } from '@/binance/binance.entity';
import { CronJob } from 'cron';

@Injectable()
export class DepositsScheduler {
  private readonly logger = new Logger(DepositsScheduler.name);
  private previousAccounts: BinanceAccount[] = [];

  constructor(
    private readonly depositsService: DepositsService,
    private readonly binanceService: BinanceService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  // Run every 1 minute to check for account changes
  @Cron('0 */1 * * * *')
  async checkBinanceAccounts() {
    const currentAccounts =
      await this.binanceService.getActiveBinanceAccounts();

    // Check if accounts have changed
    if (!this.haveAccountsChanged(this.previousAccounts, currentAccounts)) {
      return;
    }
    this.logger.debug('Binance accounts have changed, updating schedules');

    // Delete all existing schedules
    this.deleteAllAccountSchedules();

    // Create new schedules for each account
    this.createAccountSchedules(currentAccounts);

    // Update previous accounts
    this.previousAccounts = [...currentAccounts];
  }

  // Compare two arrays of accounts to see if they've changed
  private haveAccountsChanged(
    previous: BinanceAccount[],
    current: BinanceAccount[],
  ): boolean {
    if (previous.length !== current.length) {
      return true;
    }

    for (let i = 0; i < previous.length; i++) {
      if (previous[i].id != current[i].id) {
        return true;
      }
    }
    return false;
  }

  // Delete all existing account schedules
  private deleteAllAccountSchedules(): void {
    const jobs = this.schedulerRegistry.getCronJobs();

    jobs.forEach((job, name) => {
      if (name.startsWith('account-')) {
        this.schedulerRegistry.deleteCronJob(name);
        this.logger.debug(`Deleted cron job: ${name}`);
      }
    });
  }

  // Create new schedules for each account
  private createAccountSchedules(accounts: BinanceAccount[]): void {
    accounts.forEach((account, index) => {
      // Calculate the seconds delay: (i * 7) mod 60
      const secondsDelay = (index * 7) % 60;

      // Create a cron expression that runs every 10 seconds, starting at the calculated delay
      // Format: seconds minutes hours day-of-month month day-of-week
      const cronExpression = `${secondsDelay}/10 * * * * *`;

      const jobName = `account-${account.id}`;

      const job = new CronJob(cronExpression, async () => {
        (
          await this.depositsService.processSingleAccountTradeHistory(account)
        ).forEach((result) => {
          if (
            result.isErr() &&
            !result.error.message.includes('Failed to acquire lock')
          ) {
            this.logger.error(result.error.message, result.error.stack);
          }
        });
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.debug(
        `Created cron job ${jobName} with expression: ${cronExpression}`,
      );
    });
  }
}
