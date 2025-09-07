// src/deposits/deposits.service.ts

import { BinanceService } from '@/binance/binance.service';
import {
  DepositProcessQueueDto,
  NewDepositDto,
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
import Snowflakify from 'snowflakify';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';

@Injectable()
export class DepositsService {
  private readonly snowflake = new Snowflakify();

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
    private readonly settingService: SettingService,
  ) {}

  async addFakeNewDeposit(data: NewDepositDto) {
    const binanceAccount = (
      await this.binanceService.getBinanceAccountById(data.binanceId)
    ).unwrapOr(null);
    if (!binanceAccount) {
      return '';
    }
    const orderPrefix = await this.settingService.getSetting(
      SettingKey.ORDER_PREFIX,
      '385',
    );
    const snowFlakeId = this.snowflake.nextId().toString();
    const orderId = `${orderPrefix}${snowFlakeId.substring(snowFlakeId.length - 15)}`;
    await this.processDepositItemWithLock(
      {
        orderId,
        amount: data.amount,
        note: data.note,
        currency: 'USDT',
        counterpartyId: 1,
        orderType: 'C2C',
        payerInfo: {
          name: 'Fake User',
        },
        uid: 0,
        transactionTime: Date.now(),
        transactionId: '0',
        walletType: 0,
        totalPaymentFee: '0',
      },
      binanceAccount,
    );
    return orderId;
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
      return await this.insertDepositRecord(deposit);
    }

    deposit.option = option;

    // Find user and validate
    const user = (await this.usersService.findById(userId)).unwrapOr(null);

    if (!this.isValidUserForDeposit(user, deposit)) {
      return await this.insertDepositRecord(deposit);
    }

    // Calculate game result and update deposit
    await this.calculateAndUpdateGameResult(deposit);

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
    const { result, payout, meta } =
      await this.gameService.calcGameResultAndPayout(
        deposit.amount,
        deposit.orderId,
        deposit.option!,
      );

    deposit.result = result;
    deposit.payout = payout;
    deposit.meta = meta;
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

  async getRecentBinanceAccountUsedByUserId(
    userId: number,
  ): Promise<BinanceAccount[]> {
    // Find recent deposits by this user that have a mapped Binance account id
    const qb = this.depositsRepository
      .createQueryBuilder('d')
      .select([
        'd.toBinanceAccountId AS "toBinanceAccountId"',
        'MAX(d.createdAt) AS "lastUsedAt"',
      ])
      .where('d.userId = :userId', { userId })
      .andWhere('d.toBinanceAccountId IS NOT NULL')
      .groupBy('d.toBinanceAccountId')
      .orderBy('MAX(d.createdAt)', 'DESC')
      .limit(2);

    type Row = { toBinanceAccountId: number; lastUsedAt: Date };
    const rows: Row[] = await qb.getRawMany();
    if (!rows.length) {
      return [];
    }

    // Preserve ordering by lastUsedAt while loading account entities
    const idsInOrder = rows.map((r) => r.toBinanceAccountId);

    // We use binanceService to fetch accounts; batch via repository would lose order, so fetch individually to keep order small N.
    const accounts: BinanceAccount[] = [];
    for (const id of idsInOrder) {
      const result = await this.binanceService.getBinanceAccountById(id);
      if (result.isOk() && result.value) {
        accounts.push(result.value);
      }
    }
    return accounts;
  }
}
