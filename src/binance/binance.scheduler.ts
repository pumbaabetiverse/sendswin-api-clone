import { Injectable, Logger } from '@nestjs/common';
import { BinanceService } from '@/binance/binance.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepositOption } from '@/deposits/deposit.entity';

@Injectable()
export class BinanceScheduler {
  private readonly logger = new Logger(BinanceScheduler.name);

  constructor(private readonly binanceService: BinanceService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRotateAccount() {
    (
      await Promise.all(
        [DepositOption.LUCKY_NUMBER, DepositOption.ODD, DepositOption.EVEN].map(
          async (option) =>
            this.binanceService.processRotateAccountAndWithdrawToPoolWithLock(
              option,
            ),
        ),
      )
    ).map((res) =>
      res.mapErr((error) => this.logger.error(error.message, error.stack)),
    );
  }
}
