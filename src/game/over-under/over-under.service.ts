import { BinanceService } from '@/binance/binance.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';
import { SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';

@Injectable()
export class OverUnderService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositHistoryService: DepositHistoryService,
    private readonly settingService: SettingService,
  ) {}

  async getRoundWallet(userId: number): Promise<OverUnderRoundWallet> {
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);
    const [maxBet, minBet, overMultiplier, underMultiplier] = await Promise.all(
      [
        this.settingService.getFloatSetting(
          SettingKey.OVER_UNDER_MAX_AMOUNT,
          1000,
        ),
        this.settingService.getFloatSetting(
          SettingKey.OVER_UNDER_MIN_AMOUNT,
          0.5,
        ),
        this.settingService.getFloatSetting(SettingKey.OVER_MULTIPLIER, 2.2),
        this.settingService.getFloatSetting(SettingKey.UNDER_MULTIPLIER, 2.2),
      ],
    );
    return {
      binanceId: account?.binanceId,
      binanceUsername: account?.binanceUsername,
      overCode: `${userId}b`,
      underCode: `${userId}s`,
      maxBet,
      minBet,
      overMultiplier,
      underMultiplier,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositHistoryService.historyPagination(
      { userId, option: In([DepositOption.OVER, DepositOption.UNDER]) },
      pagination,
    );
  }

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
    option: DepositOption,
  ): Promise<{ result: DepositResult; payout: number }> {
    // Default values
    const defaultResult = {
      result: DepositResult.VOID,
      payout: 0,
    };
    const minAmount = await this.settingService.getFloatSetting(
      SettingKey.OVER_UNDER_MIN_AMOUNT,
      0.5,
    );
    const maxAmount = await this.settingService.getFloatSetting(
      SettingKey.OVER_UNDER_MAX_AMOUNT,
      1000,
    );
    if (amount < minAmount || amount > maxAmount) return defaultResult;

    const result = this.determineOverUnderResult(option, orderId);

    const settingMultiplierKey =
      option == DepositOption.OVER
        ? SettingKey.OVER_MULTIPLIER
        : SettingKey.UNDER_MULTIPLIER;
    const multiplier = await this.settingService.getFloatSetting(
      settingMultiplierKey,
      2.2,
    );

    let payout = 0;
    if (result == DepositResult.WIN) {
      payout = amount * multiplier;
    }

    return {
      result,
      payout,
    };
  }

  private determineOverUnderResult(
    option: DepositOption,
    transactionId: string,
  ): DepositResult {
    if (!transactionId) {
      return DepositResult.VOID;
    }
    const lastDigit = transactionId[transactionId.length - 1];

    const isOver = ['6', '7', '8', '9'].includes(lastDigit);
    const isUnder = ['1', '2', '3', '4'].includes(lastDigit);
    const userSelectedOver = option === DepositOption.OVER;

    return (userSelectedOver && isOver) || (!userSelectedOver && isUnder)
      ? DepositResult.WIN
      : DepositResult.LOSE;
  }
}
