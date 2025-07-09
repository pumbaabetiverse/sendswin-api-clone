import { Injectable, Logger } from '@nestjs/common';
import { BinanceService } from '@/binance/binance.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceProxyService } from '@/binance/binance-proxy.service';

@Injectable()
export class BinanceScheduler {
  private readonly logger = new Logger(BinanceScheduler.name);

  constructor(
    private readonly binanceService: BinanceService,
    private readonly binanceProxyService: BinanceProxyService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRotateAccount() {
    (
      await this.binanceService.processRotateAccountAndWithdrawToPoolWithLock()
    ).mapErr((error) => this.logger.error(error.message, error.stack));
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkProxies() {
    await this.binanceProxyService.performProxyCheck();
  }
}
