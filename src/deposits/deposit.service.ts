// src/deposits/deposits.service.ts

import { BinanceService } from '@/binance/binance.service';
import { SettingKey } from '@/common/const';
import {
  buildPaginateResponse,
  PaginationQuery,
  PaginationResponse,
} from '@/common/dto/pagination.dto';
import { composePagination } from '@/common/pagination';
import {
  DepositProcessQueueDto,
  PayTradeHistoryItem,
} from '@/deposits/deposit.dto';
import {
  Deposit,
  DepositOption,
  DepositResult,
} from '@/deposits/deposit.entity';
import { SettingService } from '@/setting/setting.service';
import { UsersService } from '@/users/user.service';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { FindOptionsWhere, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '@/common/event-name';
import { RefContributeEvent } from '@/referral/user-ref-circle.dto';
import { TelegramNewGameEvent } from '@/telegram/telegram.dto';
import { BinanceAccount } from '@/binance/binance.entity';
import { CacheService } from '@/cache/cache.service';
import { User } from '@/users/user.entity';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    @InjectRepository(Deposit)
    private depositsRepository: Repository<Deposit>,
    private usersService: UsersService,
    private binanceService: BinanceService,
    private settingService: SettingService,
    @InjectQueue('withdraw')
    private withdrawQueue: Queue<WithdrawRequestQueueDto>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async historyPagination(
    options: FindOptionsWhere<Deposit> | FindOptionsWhere<Deposit>[],
    pagination: PaginationQuery,
  ): Promise<PaginationResponse<Deposit>> {
    const { limit, skip, page } = composePagination(pagination);
    const [items, total] = await this.depositsRepository.findAndCount({
      where: options,
      order: { transactionTime: 'DESC' },
      skip,
      take: limit,
    });
    return buildPaginateResponse(items, total, page, limit);
  }

  async processSingleAccountTradeHistory(
    account: BinanceAccount,
  ): Promise<Result<void, Error>[]> {
    const tradeHistoryResult =
      await this.binanceService.getPayTradeHistory(account);

    if (tradeHistoryResult.isErr()) {
      return [err(tradeHistoryResult.error)];
    }

    const depositItems = tradeHistoryResult.value.filter((item) =>
      this.isDepositHistory(item),
    );

    return (
      await Promise.allSettled(
        depositItems.map((item) =>
          this.processDepositItemWithLock(item, account),
        ),
      )
    ).map((result) =>
      result.status === 'fulfilled' ? result.value : err(result.reason),
    );
  }

  private async processDepositItem(
    data: DepositProcessQueueDto,
  ): Promise<Result<void, Error>> {
    try {
      const { item, account } = data;

      // Skip if deposit already exists
      if (await this.isDepositAlreadyProcessed(item.orderId)) {
        return ok();
      }

      // Create and populate deposit record
      const deposit = this.createDepositRecord(item, account);

      // Process deposit based on payer information
      if (!item.payerInfo?.name) {
        return await this.saveDeposit(deposit);
      }

      deposit.payerUsername = item.payerInfo.name;

      // Find user and validate
      const user = await this.usersService.findByBinanceUsername(
        item.payerInfo.name,
      );
      if (!this.isValidUserForDeposit(user, deposit)) {
        return await this.saveDeposit(deposit);
      }

      // Calculate game result and update deposit
      await this.calculateAndUpdateGameResult(deposit);

      // Save deposit and process-related actions
      const saveResult = await this.saveDeposit(deposit);

      if (saveResult.isErr()) {
        return saveResult;
      }

      // Process referral commission
      this.addReferralContribution(deposit, user!);

      // Send a new game message on Telegram notification
      this.sendTelegramNotification(deposit, user!);

      // Add withdrawal winnings to the queue
      await this.addWinningWithdrawal(deposit, user!);

      return ok();
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error('Unknown error in process deposit item'));
    }
  }

  private determineOddEvenResult(
    option: DepositOption,
    transactionId: string,
  ): DepositResult {
    if (!transactionId) {
      return DepositResult.VOID;
    }
    // Calculate sums of last 3 digits
    const sumDigit = this.calculateSumOfLastDigits(transactionId, 3);

    // Check if the sum digit is a number
    if (isNaN(sumDigit)) {
      this.logger.warn(
        `Last characters of transactionId are not digits: ${transactionId}`,
      );
      return DepositResult.VOID;
    }

    const isOdd = sumDigit % 2 === 1;
    const userSelectedOdd = option === DepositOption.ODD;

    return (userSelectedOdd && isOdd) || (!userSelectedOdd && !isOdd)
      ? DepositResult.WIN
      : DepositResult.LOSE;
  }

  private determineLuckyNumberResult(transactionId: string): DepositResult {
    if (!transactionId) {
      return DepositResult.VOID;
    }
    return transactionId.endsWith('7') ? DepositResult.WIN : DepositResult.LOSE;
  }

  private async processDepositItemWithLock(
    item: PayTradeHistoryItem,
    account: BinanceAccount,
  ): Promise<Result<void, Error>> {
    const result = await this.cacheService.executeWithLock(
      `lock:deposit:${item.orderId}`,
      3000,
      async () => await this.processDepositItem({ item, account }),
    );
    if (result.isErr()) {
      return err(result.error);
    }
    return result.value;
  }

  private isDepositHistory(item: PayTradeHistoryItem): boolean {
    return (
      item.orderType === 'C2C' &&
      item.currency === 'USDT' &&
      parseFloat(item.amount) >= 0
    );
  }

  private async isDepositAlreadyProcessed(orderId: string): Promise<boolean> {
    const existingDeposit = await this.depositsRepository.findOneBy({
      orderId,
    });

    if (existingDeposit) {
      this.logger.log(
        `Deposit with orderId ${orderId} already exists, skipping processing`,
      );
      return true;
    }

    return false;
  }

  private createDepositRecord(
    item: PayTradeHistoryItem,
    account: BinanceAccount,
  ): Deposit {
    const deposit = new Deposit();
    const amount = parseFloat(item.amount);

    deposit.uid = item.uid;
    deposit.counterpartyId = item.counterpartyId;
    deposit.orderId = item.orderId;
    deposit.note = item.note;
    deposit.orderType = item.orderType;
    deposit.transactionId = item.transactionId;
    deposit.transactionTime = new Date(item.transactionTime);
    deposit.amount = amount;
    deposit.currency = item.currency;
    deposit.walletType = item.walletType;
    deposit.totalPaymentFee = item.totalPaymentFee;
    deposit.option = account.option;
    deposit.payout = 0;
    deposit.result = DepositResult.VOID;

    return deposit;
  }

  private isValidUserForDeposit(user: User | null, deposit: Deposit): boolean {
    if (!user) {
      deposit.result = DepositResult.VOID;
      return false;
    }

    deposit.userId = user.id;

    if (!user.walletAddress) {
      deposit.result = DepositResult.VOID;
      return false;
    }

    return true;
  }

  private async saveDeposit(deposit: Deposit): Promise<Result<void, Error>> {
    try {
      await this.depositsRepository.insert(deposit);
      return ok();
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error('Unknown error in save depsosit'));
    }
  }

  private async calculateAndUpdateGameResult(deposit: Deposit): Promise<void> {
    const { result, payout } = await this.calcGameResultAndPayout(
      deposit.option!,
      deposit.amount,
      deposit.orderId,
    );

    deposit.result = result;
    deposit.payout = payout;
  }

  private addReferralContribution(deposit: Deposit, user: User): void {
    if (user.parentId) {
      this.eventEmitter.emit(EventName.REF_CONTRIBUTE, {
        userId: user.id,
        parentId: user.parentId,
        amount: deposit.amount,
        createdAt: new Date(),
        depositOption: deposit.option!,
        depositResult: deposit.result,
      } satisfies RefContributeEvent);
    }
  }

  private sendTelegramNotification(deposit: Deposit, user: User): void {
    if (user.chatId) {
      this.eventEmitter.emit(EventName.TELEGRAM_NEW_GAME, {
        userChatId: user.chatId,
        orderId: deposit.orderId,
        result: deposit.result,
        amount: deposit.amount,
        payout: deposit.payout,
        option: deposit.option!,
      } satisfies TelegramNewGameEvent);
    }
  }

  private async addWinningWithdrawal(
    deposit: Deposit,
    user: User,
  ): Promise<void> {
    if (deposit.result === DepositResult.WIN) {
      await this.withdrawQueue.add(
        'withdraw',
        {
          userId: user.id,
          payout: deposit.payout,
          depositOrderId: deposit.orderId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }

  private calculateSumOfLastDigits(str: string, count: number): number {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const digit = parseInt(str.charAt(str.length - 1 - i), 10);
      if (isNaN(digit)) return NaN;
      sum += digit;
    }
    return sum;
  }

  private async calcGameResultAndPayout(
    option: DepositOption,
    amount: number,
    orderId: string,
  ): Promise<{ result: DepositResult; payout: number }> {
    // Default values
    const defaultResult = {
      result: DepositResult.VOID,
      payout: 0,
    };

    // Determine game type
    const gameType = this.determineGameType(option);
    if (!gameType) return defaultResult;

    // Check amount limits
    const { minAmount, maxAmount } = await this.getAmountLimits(gameType);
    if (amount < minAmount || amount > maxAmount) return defaultResult;

    // Determine result
    const result = this.determineGameResult(gameType, option, orderId);

    // Calculate payout if win
    let payout = 0;
    if (result === DepositResult.WIN) {
      const multiplier = await this.getMultiplier(gameType);
      payout = amount * multiplier;
    }

    return { result, payout };
  }

  private determineGameType(
    option: DepositOption,
  ): 'ODD_EVEN' | 'LUCKY_NUMBER' | null {
    if (option === DepositOption.ODD || option === DepositOption.EVEN) {
      return 'ODD_EVEN';
    } else if (option === DepositOption.LUCKY_NUMBER) {
      return 'LUCKY_NUMBER';
    }
    return null;
  }

  private async getAmountLimits(
    gameType: 'ODD_EVEN' | 'LUCKY_NUMBER',
  ): Promise<{ minAmount: number; maxAmount: number }> {
    const minAmount = await this.settingService.getFloatSetting(
      SettingKey[`${gameType}_MIN_AMOUNT`],
      gameType === 'ODD_EVEN' ? 0.5 : 0.5,
    );

    const maxAmount = await this.settingService.getFloatSetting(
      SettingKey[`${gameType}_MAX_AMOUNT`],
      gameType === 'ODD_EVEN' ? 50 : 10,
    );

    return { minAmount, maxAmount };
  }

  private determineGameResult(
    gameType: string,
    option: DepositOption,
    orderId: string,
  ): DepositResult {
    return gameType === 'ODD_EVEN'
      ? this.determineOddEvenResult(option, orderId)
      : this.determineLuckyNumberResult(orderId);
  }

  private async getMultiplier(
    gameType: 'ODD_EVEN' | 'LUCKY_NUMBER',
  ): Promise<number> {
    return await this.settingService.getFloatSetting(
      SettingKey[`${gameType}_MULTIPLIER`],
      gameType === 'ODD_EVEN' ? 1.95 : 300,
    );
  }
}
