import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BinanceClient } from '../binance-client';
import Big from 'big.js';

@Injectable()
export class AdminBinanceAccountService extends TypeOrmCrudService<BinanceAccount> {
  private readonly logger = new Logger(AdminBinanceAccountService.name);
  constructor(
    @InjectRepository(BinanceAccount)
    private readonly repository: Repository<BinanceAccount>,
  ) {
    super(repository);
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    waitForCompletion: true,
  })
  async syncAllBalances() {
    const items = await this.repository.find({
      where: {
        status: BinanceAccountStatus.ACTIVE,
      },
    });
    if (!items.length) return;
    return Promise.allSettled(items.map((v) => this.#syncBalance(v, 'USDT')));
  }

  async #syncBalance(account: BinanceAccount, symbol: string) {
    try {
      const binanceClient = new BinanceClient({
        apiKey: account.binanceApiKey,
        apiSecret: account.binanceApiSecret,
        proxy: account.proxy,
      });

      const balance = await binanceClient.getAccountBalanceBySymbol(symbol);
      if (balance && Big(balance).gt(0)) {
        await this.repository.update(
          {
            id: account.id,
          },
          {
            usdtBalance: Big(balance).toNumber(),
          },
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
