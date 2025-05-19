import {
  BinanceClient,
  PayTradeHistoryResponse,
} from '@/binance/binance-client';
import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { err, ok, Result } from 'neverthrow';
import { CacheService } from '@/cache/cache.service';
import { fromPromiseResult } from '@/common/errors';
import { SettingService } from '@/setting/setting.service';
import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import { TelegramAdminService } from '@/telegram-admin/telegram-admin.service';
import Big from 'big.js';

@Injectable()
export class BinanceService {
  constructor(
    @InjectRepository(BinanceAccount)
    private readonly binanceAccountsRepository: Repository<BinanceAccount>,
    private readonly cacheService: CacheService,
    private readonly settingService: SettingService,
    private readonly telegramAdminService: TelegramAdminService,
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

  async processRotateAccountAndWithdrawToPoolWithLock(option: DepositOption) {
    const res = await this.cacheService.executeWithLock(
      `lock:rotate:account:${option}`,
      3000,
      async () => this.processRotateAccountAndWithdrawToPool(option),
    );
    return res.isOk() ? res.value : err(res.error);
  }

  async getCurrentRotateAccount(
    option: DepositOption,
  ): Promise<Result<BinanceAccount, Error>> {
    const currentId = (await this.getCurrentRotateAccountId(option)).unwrapOr(
      null,
    );

    if (!currentId) {
      return this.setNextRotateAccount(option);
    }

    const result = await this.getBinanceAccountById(currentId);

    if (result.isErr()) {
      return err(result.error);
    }
    return result.value
      ? ok(result.value)
      : err(new Error('No active binance account'));
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
    return result
      .map((value) => value.data)
      .mapErr(
        (err) =>
          new Error(`Binance account ${account.id}: ${err.message}`, {
            cause: err.cause,
          }),
      );
  }

  private async syncAccountBalance(
    account: BinanceAccount,
    symbol: BlockchainToken,
  ): Promise<Result<BinanceAccount, Error>> {
    const binanceClient = new BinanceClient({
      apiKey: account.binanceApiKey,
      apiSecret: account.binanceApiSecret,
      proxy: account.proxy,
    });
    const balanceResult = await binanceClient.getAccountBalanceBySymbol(symbol);

    if (balanceResult.isErr()) {
      return err(balanceResult.error);
    }

    account.usdtBalance = Big(balanceResult.value).toNumber();

    return fromPromiseResult(this.binanceAccountsRepository.save(account));
  }

  private async getCurrentRotateSyncedAccount(
    option: DepositOption,
  ): Promise<Result<BinanceAccount, Error>> {
    const currentResult = await this.getCurrentRotateAccount(option);
    if (currentResult.isErr()) {
      return err(currentResult.error);
    }
    return this.syncAccountBalance(currentResult.value, BlockchainToken.USDT);
  }

  private async processRotateAccountAndWithdrawToPool(
    option: DepositOption,
  ): Promise<Result<void, Error>> {
    const currentResult = await this.getCurrentRotateSyncedAccount(option);
    if (currentResult.isErr()) {
      return err(currentResult.error);
    }

    const currentAccount = currentResult.value;

    if (!(await this.isNeedToRotate(currentAccount))) {
      return ok();
    }

    const nextResult = await this.setNextRotateAccount(option);

    if (nextResult.isErr()) {
      return err(nextResult.error);
    }

    const withdrawResult = await this.withdrawToPool(currentAccount);
    if (withdrawResult.isErr()) {
      this.telegramAdminService.notify(
        `❌ *Auto Withdrawal Failed *\n\n` +
          `📤 *From:* Binance Account #${currentAccount.id}\n` +
          `📬 *To:* *Pool*\n` +
          `💰 *Amount:* ${Math.floor(currentAccount.usdtBalance)} USDT\n` +
          `⚠️ *Error:* \`${withdrawResult.error.message}\`\n`,
      );

      return err(withdrawResult.error);
    }
    this.telegramAdminService.notify(
      `✅ *Auto Withdrawal Successful*\n\n` +
        `📤 *From:* Binance Account #${currentAccount.id}\n` +
        `📬 *To:* *Pool*\n` +
        `💰 *Amount:* ${Math.floor(currentAccount.usdtBalance)} USDT\n` +
        `🆔 *Request ID:* \`${withdrawResult.value}\`\n`,
    );

    return ok();
  }

  private async withdrawToPool(
    account: BinanceAccount,
  ): Promise<Result<string, Error>> {
    const poolAddress = await this.settingService.getSetting(
      SettingKey.POOL_ADDRESS,
      '0xd8cEbb39C86DcCAe4efEef336fcc40923d017702',
    );

    const binanceClient = new BinanceClient({
      apiKey: account.binanceApiKey,
      apiSecret: account.binanceApiSecret,
      proxy: account.proxy,
    });

    return (
      await binanceClient.withdraw(
        BlockchainToken.USDT,
        poolAddress,
        BlockchainNetwork.OPBNB,
        Math.floor(account.usdtBalance),
      )
    ).map((value) => value.id);
  }

  private async setNextRotateAccount(
    option: DepositOption,
  ): Promise<Result<BinanceAccount, Error>> {
    const accountResult = await this.getLastUsedActiveAccount(option);
    if (accountResult.isErr()) {
      return err(accountResult.error);
    }
    const account = accountResult.value;
    if (!account) {
      return err(new Error('No active binance account'));
    }

    const setResult = await this.setCurrentRotateAccountId(option, account.id);
    if (setResult.isErr()) {
      return err(setResult.error);
    }
    account.lastUsedAt = new Date();
    return this.saveAccount(account);
  }

  private getAccountUsageInMinute(lastUsedAt: Date): number {
    return Math.floor(
      (new Date().getTime() - lastUsedAt.getTime()) / (1000 * 60),
    );
  }

  private async isNeedToRotate(account: BinanceAccount): Promise<boolean> {
    const minWithdraw = await this.settingService.getFloatSetting(
      SettingKey.ROTATE_ACCOUNT_MIN_WITHDRAW_AMOUNT,
      200,
    );
    const minUsedInMinute = await this.settingService.getNumberSetting(
      SettingKey.ROTATE_ACCOUNT_MIN_USED_IN_MINUTE,
      10,
    );

    return (
      account.status == BinanceAccountStatus.INACTIVE ||
      (account.usdtBalance >= minWithdraw &&
        this.getAccountUsageInMinute(account.lastUsedAt) >= minUsedInMinute)
    );
  }

  private async setCurrentRotateAccountId(option: DepositOption, id: number) {
    return fromPromiseResult(
      this.cacheService
        .getRedis()
        .set(`game:account:rotate:${option}`, id.toString()),
    );
  }

  private async saveAccount(
    account: BinanceAccount,
  ): Promise<Result<BinanceAccount, Error>> {
    return fromPromiseResult(this.binanceAccountsRepository.save(account));
  }

  private async getLastUsedActiveAccount(
    option: DepositOption,
  ): Promise<Result<BinanceAccount | null, Error>> {
    return fromPromiseResult(
      this.binanceAccountsRepository.findOne({
        where: {
          status: BinanceAccountStatus.ACTIVE,
          option,
        },
        order: {
          lastUsedAt: 'ASC',
        },
      }),
    );
  }

  private async getBinanceAccountById(
    id: number,
  ): Promise<Result<BinanceAccount | null, Error>> {
    return fromPromiseResult(
      this.binanceAccountsRepository.findOneBy({
        id,
      }),
    );
  }

  private async getCurrentRotateAccountId(
    option: DepositOption,
  ): Promise<Result<number | null, Error>> {
    const redisClient = this.cacheService.getRedis();
    const result = await fromPromiseResult(
      redisClient.get(`game:account:rotate:${option}`),
    );
    if (!result.isOk()) {
      return err(result.error);
    }
    return ok(result.value ? Number(result.value) : null);
  }
}
