import {
  BinanceClient,
  PayTradeHistoryResponse,
} from '@/binance/binance-client';
import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from 'neverthrow';

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
      order: {
        id: 'ASC',
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

  async getPayTradeHistory(
    account: BinanceAccount,
  ): Promise<Result<PayTradeHistoryResponse['data'], Error>> {
    const binanceClient = new BinanceClient({
      apiKey: account.binanceApiKey,
      apiSecret: account.binanceApiSecret,
      proxy: account.proxy,
    });

    const result = await binanceClient.getPayTradeHistory(50);
    return result.map((value) => value.data);
  }
}
