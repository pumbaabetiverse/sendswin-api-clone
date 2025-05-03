import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BinanceClient } from '../binance-client';
import Big from 'big.js';
import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';
import { err, Result } from 'neverthrow';

@Injectable()
export class AdminBinanceAccountService extends TypeOrmCrudService<BinanceAccount> {
  private readonly logger = new Logger(AdminBinanceAccountService.name);

  constructor(
    @InjectRepository(BinanceAccount)
    private readonly repository: Repository<BinanceAccount>,
    private readonly settingService: SettingService,
  ) {
    super(repository);
  }

  async withdrawToWallet(
    accountId: number,
    symbol: BlockchainToken,
    network: BlockchainNetwork,
    amount: number,
    walletAddress: string,
  ): Promise<Result<string, Error>> {
    if (amount < 20) {
      return err(new Error('Amount must not be less than 20'));
    }
    const whiteList = (
      await this.settingService.getSetting(
        SettingKey.WHITELIST_WALLET_WITHDRAW,
        '',
      )
    )
      .split(',')
      .map((w) => w.toLowerCase());

    const lowerWalletAddress = walletAddress.toLowerCase();
    if (!whiteList.includes(lowerWalletAddress)) {
      return err(new Error('Wallet address is not in whitelist'));
    }

    const account = await this.repository.findOneByOrFail({ id: accountId });

    await this.#syncBalance(account, symbol);

    const syncAccount = await this.repository.findOneByOrFail({
      id: accountId,
    });

    if (syncAccount.usdtBalance < amount) {
      return err(new Error('Insufficient balance'));
    }

    const binanceClient = new BinanceClient({
      apiKey: account.binanceApiKey,
      apiSecret: account.binanceApiSecret,
      proxy: account.proxy,
    });

    return (
      await binanceClient.withdraw(symbol, walletAddress, network, amount)
    ).map((value) => value.id);
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
    const binanceClient = new BinanceClient({
      apiKey: account.binanceApiKey,
      apiSecret: account.binanceApiSecret,
      proxy: account.proxy,
    });

    const balanceResult = await binanceClient.getAccountBalanceBySymbol(symbol);

    if (balanceResult.isErr()) {
      this.logger.error(balanceResult.error.message, balanceResult.error.stack);
      return;
    }

    const balance = balanceResult.value;

    if (Big(balance).gt(0)) {
      await this.repository.update(
        {
          id: account.id,
        },
        {
          usdtBalance: Big(balance).toNumber(),
        },
      );
    }
  }
}
