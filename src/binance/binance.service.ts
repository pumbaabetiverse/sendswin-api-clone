import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { Repository } from 'typeorm';
import {
  BinanceClient,
  PayTradeHistoryResponse,
} from '@/binance/binance-client';
import { DepositOption } from '@/deposits/deposit.entity';
import Big from 'big.js';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BinanceService {
  private logger = new Logger(BinanceService.name);

  constructor(
    @InjectRepository(BinanceAccount)
    private binanceAccountsRepository: Repository<BinanceAccount>,
  ) {}

  async getActiveBinanceAccounts(): Promise<BinanceAccount[]> {
    return this.binanceAccountsRepository.find({
      where: {
        status: BinanceAccountStatus.ACTIVE,
      },
    });
  }

  async getRandomActiveBinanceAccount(
    option: DepositOption,
  ): Promise<BinanceAccount | null> {
    const accounts = await this.binanceAccountsRepository.find({
      where: {
        status: BinanceAccountStatus.ACTIVE,
        option: option,
      },
    });

    if (accounts.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * accounts.length);
    return accounts[randomIndex];
  }

  async getPayTradeHistoryActiveAccounts(): Promise<
    PayTradeHistoryResponse['data']
  > {
    const accounts = await this.getActiveBinanceAccounts();
    const allHistory: PayTradeHistoryResponse['data'] = [];
    for (const account of accounts) {
      allHistory.push(...(await this.getPayTradeHistory(account)));
    }
    return allHistory;
  }

  async getPayTradeHistory(
    account: BinanceAccount,
  ): Promise<PayTradeHistoryResponse['data']> {
    try {
      const binanceClient = new BinanceClient({
        apiKey: account.binanceApiKey,
        apiSecret: account.binanceApiSecret,
        proxy: account.proxy,
      });

      const response = await binanceClient.getPayTradeHistory(50);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
      return [];
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    waitForCompletion: true,
  })
  async syncAllBalances() {
    const items = await this.binanceAccountsRepository.find({
      select: ['id'],
      where: {
        status: BinanceAccountStatus.ACTIVE,
      },
    });
    if (!items.length) return;
    return Promise.allSettled(
      items.map((v) => this.#syncBalance(v.id, 'USDT')),
    );
  }

  async #syncBalance(accountId: number, symbol: string) {
    try {
      const account = await this.binanceAccountsRepository.findOneOrFail({
        where: {
          id: accountId,
        },
      });
      const binanceClient = new BinanceClient({
        apiKey: account.binanceApiKey,
        apiSecret: account.binanceApiSecret,
        proxy: account.proxy,
      });

      const balance = await binanceClient.getAccountBalanceBySymbol(symbol);
      if (balance && Big(balance).gt(0)) {
        await this.binanceAccountsRepository.update(
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
