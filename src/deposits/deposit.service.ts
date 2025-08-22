// src/deposits/deposits.service.ts

import { BinanceService } from '@/binance/binance.service';
import {
  DepositProcessQueueDto,
  PayTradeHistoryItem,
} from '@/deposits/deposit.dto';
import {
  Deposit,
  DepositOption,
  DepositResult,
} from '@/deposits/deposit.entity';
import { UsersService } from '@/users/user.service';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '@/common/event-name';
import { RefContributeEvent } from '@/referral/user-ref-circle.dto';
import { BinanceAccount } from '@/binance/binance.entity';
import { CacheService } from '@/cache/cache.service';
import { User } from '@/users/user.entity';
import { err, ok, Result } from 'neverthrow';
import {
  createWithdrawSourceId,
  WithdrawType,
} from '@/withdraw/withdraw.domain';
import { fromPromiseResult } from '@/common/errors';
import { DepositNotificationService } from '@/deposits/deposit-notification.service';
import { GameService } from '@/game/game.service';

@Injectable()
export class DepositsService {
  constructor(
    @InjectRepository(Deposit)
    private readonly depositsRepository: Repository<Deposit>,
    private readonly usersService: UsersService,
    private readonly binanceService: BinanceService,
    private readonly gameService: GameService,
    @InjectQueue('withdraw')
    private readonly withdrawQueue: Queue<WithdrawRequestQueueDto>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly depositNotificationService: DepositNotificationService,
  ) {}

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
    const { item, account } = data;

    // Skip if deposit already exists
    if (await this.isDepositAlreadyProcessed(item.orderId)) {
      return ok();
    }

    // Create and populate deposit record
    const deposit = this.createDepositRecord(item, account);

    const [userId, option] = this.parseTransactionNote(item.note);

    if (!userId || !option) {
      this.depositNotificationService.sendDepositNotificationToAdmin(deposit);
      return await this.insertDepositRecord(deposit);
    }

    deposit.option = option;

    // Find user and validate
    const user = (await this.usersService.findById(userId)).unwrapOr(null);

    if (!this.isValidUserForDeposit(user, deposit)) {
      this.depositNotificationService.sendDepositNotificationToAdmin(deposit);
      return await this.insertDepositRecord(deposit);
    }

    // Calculate game result and update deposit
    await this.calculateAndUpdateGameResult(deposit);

    this.depositNotificationService.sendDepositNotificationToAdmin(deposit);

    // Save deposit and process-related actions
    const saveResult = await this.insertDepositRecord(deposit);

    if (saveResult.isErr()) {
      return saveResult;
    }

    // Process referral commission
    if (deposit.result != DepositResult.VOID) {
      this.addReferralContribution(deposit, user!);
    }

    // Send a new game message on Telegram notification
    await this.depositNotificationService.sendNewGameNotification(
      user!,
      deposit,
    );

    // Add withdrawal winnings to the queue
    await this.addWinningWithdrawal(deposit, user!);

    return ok();
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
    return !!existingDeposit;
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
    deposit.payout = 0;
    deposit.result = DepositResult.VOID;
    deposit.toBinanceAccountId = account.id;
    deposit.payerUsername = item.payerInfo?.name;

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

  private async insertDepositRecord(
    deposit: Deposit,
  ): Promise<Result<void, Error>> {
    return fromPromiseResult(this.depositsRepository.insert(deposit)).map(
      () => undefined,
    );
  }

  private async calculateAndUpdateGameResult(deposit: Deposit): Promise<void> {
    const { result, payout } = await this.gameService.calcGameResultAndPayout(
      deposit.amount,
      deposit.orderId,
      deposit.option!,
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
          sourceId: createWithdrawSourceId(WithdrawType.GAME, deposit.orderId),
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }

  private parseTransactionNote(
    note: string,
  ): [number | null, DepositOption | null] {
    try {
      if (note.length == 0) {
        return [null, null];
      }

      const lowerNote = note.toLowerCase();

      let option: DepositOption;
      let rawId: string;

      // Check for lottery game formats (l1, l2, l3)
      if (lowerNote.endsWith('l1')) {
        option = DepositOption.LOTTERY_1;
        rawId = lowerNote.substring(0, lowerNote.length - 2);
      } else if (lowerNote.endsWith('l2')) {
        option = DepositOption.LOTTERY_2;
        rawId = lowerNote.substring(0, lowerNote.length - 2);
      } else if (lowerNote.endsWith('l3')) {
        option = DepositOption.LOTTERY_3;
        rawId = lowerNote.substring(0, lowerNote.length - 2);
      } else {
        // Handle original formats (o, e, g)
        const rawOption = lowerNote[lowerNote.length - 1];

        if (rawOption == 'o') {
          option = DepositOption.ODD;
        } else if (rawOption == 'e') {
          option = DepositOption.EVEN;
        } else if (rawOption == 'g') {
          option = DepositOption.LUCKY_NUMBER;
        } else if (rawOption == 'b') {
          option = DepositOption.OVER;
        } else if (rawOption == 's') {
          option = DepositOption.UNDER;
        } else {
          return [null, null];
        }

        rawId = lowerNote.substring(0, lowerNote.length - 1);
      }

      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        return [null, null];
      }
      return [id, option];
    } catch {
      return [null, null];
    }
  }
}
