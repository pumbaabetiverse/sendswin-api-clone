// src/deposits/deposits.service.ts

import { BinanceService } from '@/binance/binance.service';
import { SettingKey } from '@/common/const';
import {
  buildPaginateResponse,
  PaginationQuery,
  PaginationResponse,
} from '@/common/dto/pagination.dto';
import { composePagination } from '@/common/pagination';
import { DepositProcessQueueDto } from '@/deposits/deposit.dto';
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
    @InjectQueue('deposit-process')
    private depositProcessQueue: Queue<DepositProcessQueueDto>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async historyPagination(
    options: FindOptionsWhere<Deposit> | FindOptionsWhere<Deposit>[],
    pagination: PaginationQuery,
  ): Promise<PaginationResponse<Deposit>> {
    const { limit, skip, page } = composePagination(pagination);
    const [items, total] = await this.depositsRepository.findAndCount({
      where: options,
      order: {
        transactionTime: 'DESC',
      },
      skip,
      take: limit,
    });
    return buildPaginateResponse(items, total, page, limit);
  }

  async getUserHistory(userId: number) {
    return this.depositsRepository.find({
      where: {
        userId: userId,
      },
      order: {
        transactionTime: 'DESC',
      },
      take: 10,
    });
  }

  async processPayTradeHistory(): Promise<void> {
    try {
      const accounts = await this.binanceService.getActiveBinanceAccounts();

      // Process all accounts in parallel
      const processAccountPromises = accounts.map(async (account) => {
        try {
          const data = await this.binanceService.getPayTradeHistory(account);
          let accountDepositsCount = 0;

          for (const item of data) {
            try {
              // console.log(item.payerInfo);
              const amount = parseFloat(item.amount);
              // Check if this is a C2C transaction, with amount between 10 and 50, and the currency is USDT
              if (
                item.orderType === 'C2C' &&
                item.currency === 'USDT' &&
                amount >= 0
              ) {
                // Check if a deposit with this orderId already exists
                const existingDeposit = await this.depositsRepository.findOneBy(
                  {
                    orderId: item.orderId,
                  },
                );

                if (!existingDeposit) {
                  // Add to the deposit process queue
                  await this.depositProcessQueue.add(
                    'process-deposit',
                    {
                      item,
                      account,
                    },
                    {
                      removeOnComplete: true,
                      removeOnFail: true,
                    },
                  );
                  accountDepositsCount++;
                }
              }
            } catch (error) {
              if (error instanceof Error) {
                this.logger.error(
                  `Error processing pay trade history item: ${error.message}`,
                  error.stack,
                );
              }
            }
          }

          return accountDepositsCount;
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(
              `Error processing account ${account.binanceUsername}: ${error.message}`,
              error.stack,
            );
          }
          return 0;
        }
      });

      // Wait for all account processing to complete
      const depositCounts = await Promise.all(processAccountPromises);

      // Sum up all new deposits
      const newDepositsCount = depositCounts.reduce(
        (sum, count) => sum + count,
        0,
      );

      if (newDepositsCount > 0) {
        this.logger.log(`Added ${newDepositsCount} new deposits`);
      } else {
        this.logger.log('No new qualifying deposits found');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error processing pay trade history: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  determineOddEvenResult(
    option: DepositOption,
    transactionId: string,
  ): DepositResult {
    if (!transactionId) {
      return DepositResult.VOID;
    }

    // Get the last character of the transaction ID
    const sumDigit =
      parseInt(transactionId.charAt(transactionId.length - 1), 10) +
      parseInt(transactionId.charAt(transactionId.length - 2), 10) +
      parseInt(transactionId.charAt(transactionId.length - 3), 10);

    // Check if the sum digit is a number
    if (isNaN(sumDigit)) {
      this.logger.warn(
        `Last character of transactionId is not a digit: ${transactionId}`,
      );
      return DepositResult.VOID;
    }

    // Determine if the last digit is odd or even
    const isOdd = sumDigit % 2 == 1;

    const isEven = sumDigit % 2 == 0;

    // Determine if the user wins based on their option and the outcome
    if (option == DepositOption.ODD && isOdd) {
      return DepositResult.WIN;
    } else if (option === DepositOption.EVEN && isEven) {
      return DepositResult.WIN;
    } else {
      return DepositResult.LOSE;
    }
  }

  determineLuckyNumberResult(transactionId: string): DepositResult {
    if (!transactionId) {
      return DepositResult.VOID;
    }
    if (transactionId.endsWith('7')) {
      return DepositResult.WIN;
    } else {
      return DepositResult.LOSE;
    }
  }

  async processDepositItem(data: DepositProcessQueueDto): Promise<void> {
    try {
      const { item, account } = data;
      const amount = parseFloat(item.amount);

      const existingDeposit = await this.depositsRepository.findOneBy({
        orderId: item.orderId,
      });

      if (existingDeposit) {
        this.logger.log(
          `Deposit with orderId ${item.orderId} already exists, skipping processing`,
        );
        return;
      }

      // Create a new deposit
      const deposit = new Deposit();
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

      if (!item.payerInfo?.name) {
        await this.depositsRepository.save(deposit);
        return;
      }

      deposit.payerUsername = item.payerInfo.name;

      const user = await this.usersService.findByBinanceUsername(
        item.payerInfo.name,
      );

      if (!user) {
        deposit.result = DepositResult.VOID;
        await this.depositsRepository.save(deposit);
        return;
      }

      deposit.userId = user.id;

      if (!user.walletAddress) {
        deposit.result = DepositResult.VOID;
        await this.depositsRepository.save(deposit);
        return;
      }

      if (
        account.option === DepositOption.ODD ||
        account.option === DepositOption.EVEN
      ) {
        const minAmount = await this.settingService.getFloatSetting(
          SettingKey.ODD_EVEN_MIN_AMOUNT,
          0.5,
        );
        const maxAmount = await this.settingService.getFloatSetting(
          SettingKey.ODD_EVEN_MAX_AMOUNT,
          50,
        );

        if (amount >= minAmount && amount <= maxAmount) {
          deposit.result = this.determineOddEvenResult(
            account.option,
            item.orderId,
          );
        } else {
          deposit.result = DepositResult.VOID;
        }

        if (deposit.result == DepositResult.WIN) {
          const multiplier = await this.settingService.getFloatSetting(
            SettingKey.ODD_EVEN_MULTIPLIER,
            1.95,
          );
          deposit.payout = amount * multiplier;
        }
      } else if (account.option == DepositOption.LUCKY_NUMBER) {
        const minAmount = await this.settingService.getFloatSetting(
          SettingKey.LUCKY_NUMBER_MIN_AMOUNT,
          0.5,
        );
        const maxAmount = await this.settingService.getFloatSetting(
          SettingKey.LUCKY_NUMBER_MAX_AMOUNT,
          10,
        );

        if (amount >= minAmount && amount <= maxAmount) {
          deposit.result = this.determineLuckyNumberResult(item.orderId);
        } else {
          deposit.result = DepositResult.VOID;
        }

        if (deposit.result == DepositResult.WIN) {
          const multiplier = await this.settingService.getFloatSetting(
            SettingKey.LUCKY_NUMBER_MULTIPLIER,
            300,
          );
          deposit.payout = amount * multiplier;
        }
      }

      await this.depositsRepository.insert(deposit);

      if (user.parentId) {
        this.eventEmitter.emit(EventName.REF_CONTRIBUTE, {
          userId: user.id,
          parentId: user.parentId,
          amount: deposit.amount,
          createdAt: new Date(),
          depositOption: account.option,
          depositResult: deposit.result,
        } satisfies RefContributeEvent);
      }

      if (user.chatId) {
        this.eventEmitter.emit(EventName.TELEGRAM_NEW_GAME, {
          userChatId: user.chatId,
          deposit,
        } satisfies TelegramNewGameEvent);
      }

      if (deposit.result == DepositResult.WIN) {
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
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error processing deposit item: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
