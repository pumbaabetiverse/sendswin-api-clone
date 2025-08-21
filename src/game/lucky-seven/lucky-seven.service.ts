import { BinanceService } from '@/binance/binance.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { LuckySevenRoundWallet } from './dto/lucky-seven.dto';
import { In } from 'typeorm';
import { SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';

@Injectable()
export class LuckySevenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositHistoryService: DepositHistoryService,
    private readonly settingService: SettingService,
  ) {}

  async getRoundWallet(userId: number): Promise<LuckySevenRoundWallet> {
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);
    const [maxBet, minBet, multiplier] = await Promise.all([
      this.settingService.getFloatSetting(
        SettingKey.LUCKY_NUMBER_MAX_AMOUNT,
        50,
      ),
      this.settingService.getFloatSetting(
        SettingKey.LUCKY_NUMBER_MIN_AMOUNT,
        0.5,
      ),
      this.settingService.getFloatSetting(
        SettingKey.LUCKY_NUMBER_MULTIPLIER,
        1.95,
      ),
    ]);
    return {
      binanceQrCodeUrl: account?.binanceQrCodeUrl,
      binanceId: account?.binanceId,
      binanceUsername: account?.binanceUsername,
      maxBet,
      multiplier,
      minBet,
      code: `${userId}g`,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositHistoryService.historyPagination(
      { userId, option: In([DepositOption.LUCKY_NUMBER]) },
      pagination,
    );
  }

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
  ): Promise<{ result: DepositResult; payout: number }> {
    // Default values
    const defaultResult = {
      result: DepositResult.VOID,
      payout: 0,
    };
    const minAmount = await this.settingService.getFloatSetting(
      SettingKey.LUCKY_NUMBER_MIN_AMOUNT,
      0.5,
    );
    const maxAmount = await this.settingService.getFloatSetting(
      SettingKey.LUCKY_NUMBER_MAX_AMOUNT,
      1000,
    );
    if (amount < minAmount || amount > maxAmount) return defaultResult;

    const result = orderId.endsWith('7')
      ? DepositResult.WIN
      : DepositResult.LOSE;

    const multiplier = await this.settingService.getFloatSetting(
      SettingKey.LUCKY_NUMBER_MULTIPLIER,
      30,
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
}
