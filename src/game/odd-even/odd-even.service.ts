import { BinanceService } from '@/binance/binance.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';
import { OddEvenRoundWallet } from '@/game/odd-even/dto/odd-even.dto';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';

@Injectable()
export class OddEvenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositHistoryService: DepositHistoryService,
    private readonly settingService: SettingService,
  ) {}

  async getRoundWallet(userId: number): Promise<OddEvenRoundWallet> {
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);
    const [maxBet, minBet, oddMultiplier, evenMultiplier] = await Promise.all([
      this.settingService.getFloatSetting(SettingKey.ODD_EVEN_MAX_AMOUNT, 50),
      this.settingService.getFloatSetting(SettingKey.ODD_EVEN_MIN_AMOUNT, 0.5),
      this.settingService.getFloatSetting(SettingKey.ODD_MULTIPLIER, 1.95),
      this.settingService.getFloatSetting(SettingKey.EVEN_MULTIPLIER, 1.95),
    ]);
    return {
      oddWallet: account?.binanceQrCodeUrl,
      evenWallet: account?.binanceQrCodeUrl,
      evenCode: `${userId}e`,
      oddCode: `${userId}o`,
      maxBet,
      minBet,
      oddMultiplier,
      evenMultiplier,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositHistoryService.historyPagination(
      { userId, option: In([DepositOption.ODD, DepositOption.EVEN]) },
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
      SettingKey.ODD_EVEN_MIN_AMOUNT,
      0.5,
    );
    const maxAmount = await this.settingService.getFloatSetting(
      SettingKey.ODD_EVEN_MAX_AMOUNT,
      1000,
    );
    if (amount < minAmount || amount > maxAmount) return defaultResult;

    const result = this.determineOddEvenResult(option, orderId);

    const settingMultiplierKey =
      option == DepositOption.ODD
        ? SettingKey.ODD_MULTIPLIER
        : SettingKey.EVEN_MULTIPLIER;
    const multiplier = await this.settingService.getFloatSetting(
      settingMultiplierKey,
      1.95,
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
      return DepositResult.VOID;
    }

    const isOdd = sumDigit % 2 === 1;
    const userSelectedOdd = option === DepositOption.ODD;

    return (userSelectedOdd && isOdd) || (!userSelectedOdd && !isOdd)
      ? DepositResult.WIN
      : DepositResult.LOSE;
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
}
