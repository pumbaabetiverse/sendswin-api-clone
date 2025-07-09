import { BinanceService } from '@/binance/binance.service';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { DepositsService } from '@/deposits/deposit.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';
import { OddEvenRoundWallet } from '@/game/odd-even/dto/odd-even.dto';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';

@Injectable()
export class OddEvenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositsService: DepositsService,
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
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.ODD, DepositOption.EVEN]) },
      pagination,
    );
  }
}
