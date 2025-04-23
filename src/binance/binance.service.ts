import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { Repository } from 'typeorm';
import {
  BinanceClient,
  PayTradeHistoryResponse,
} from '@/binance/binance-client';
import { DepositOption } from '@/deposits/deposit.entity';

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
}
