import { BinanceService } from '@/binance/binance.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { DepositOption } from '@/deposits/deposit.entity';
import { DepositsService } from '@/deposits/deposit.service';
import { Injectable } from '@nestjs/common';
import { LuckySevenRoundWallet } from './dto/lucky-seven.dto';
import { In } from 'typeorm';
import { SettingKey } from '@/common/const';
import { SettingService } from '@/setting/setting.service';

@Injectable()
export class LuckySevenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositsService: DepositsService,
    private readonly settingService: SettingService,
  ) {}

  async getRoundWallet(userId: number): Promise<LuckySevenRoundWallet> {
    const result = await this.binanceService.getCurrentRotateAccount(
      DepositOption.LUCKY_NUMBER,
    );
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
      binanceQrCodeUrl: result.unwrapOr(null)?.binanceQrCodeUrl,
      maxBet,
      multiplier,
      minBet,
      code: `${userId}g`,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.LUCKY_NUMBER]) },
      pagination,
    );
  }
}
