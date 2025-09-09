import { BinanceAccount, BinanceAccountStatus } from '@/binance/binance.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { err, ok, Result } from 'neverthrow';
import { CacheService } from '@/cache/cache.service';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class BinanceService {
  constructor(
    @InjectRepository(BinanceAccount)
    private readonly binanceAccountsRepository: Repository<BinanceAccount>,
    private readonly cacheService: CacheService,
  ) {}

  async getAll(): Promise<Result<BinanceAccount[], Error>> {
    return fromPromiseResult(this.binanceAccountsRepository.find({}));
  }

  async getCurrentRotateAccount(): Promise<Result<BinanceAccount, Error>> {
    const currentId = (await this.getCurrentRotateAccountId()).unwrapOr(null);

    if (!currentId) {
      return this.setNextRotateAccount();
    }

    const result = await this.getBinanceAccountById(currentId);

    if (result.isErr()) {
      return err(result.error);
    }
    return result.value
      ? ok(result.value)
      : err(new Error('No active binance account'));
  }

  private async setNextRotateAccount(): Promise<Result<BinanceAccount, Error>> {
    const accountResult = await this.getLastUsedActiveAccount();
    if (accountResult.isErr()) {
      return err(accountResult.error);
    }
    const account = accountResult.value;
    if (!account) {
      return err(new Error('No active binance account'));
    }

    const setResult = await this.setCurrentRotateAccountId(account.id);
    if (setResult.isErr()) {
      return err(setResult.error);
    }
    account.lastUsedAt = new Date();
    return this.saveAccount(account);
  }

  private async setCurrentRotateAccountId(id: number) {
    return fromPromiseResult(
      this.cacheService.getRedis().set(`game:account:rotate`, id.toString()),
    );
  }

  private async saveAccount(
    account: BinanceAccount,
  ): Promise<Result<BinanceAccount, Error>> {
    return fromPromiseResult(this.binanceAccountsRepository.save(account));
  }

  private async getLastUsedActiveAccount(): Promise<
    Result<BinanceAccount | null, Error>
  > {
    return fromPromiseResult(
      this.binanceAccountsRepository.findOne({
        where: {
          status: BinanceAccountStatus.ACTIVE,
        },
        order: {
          lastUsedAt: 'ASC',
        },
      }),
    );
  }

  public async getBinanceAccountById(
    id: number,
  ): Promise<Result<BinanceAccount | null, Error>> {
    return fromPromiseResult(
      this.binanceAccountsRepository.findOneBy({
        id,
      }),
    );
  }

  private async getCurrentRotateAccountId(): Promise<
    Result<number | null, Error>
  > {
    const redisClient = this.cacheService.getRedis();
    const result = await fromPromiseResult(
      redisClient.get(`game:account:rotate`),
    );
    if (!result.isOk()) {
      return err(result.error);
    }
    return ok(result.value ? Number(result.value) : null);
  }
}
