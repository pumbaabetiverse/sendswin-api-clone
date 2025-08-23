import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In, Repository } from 'typeorm';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { BinanceService } from '@/binance/binance.service';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';
import { SettingService } from '@/setting/setting.service';
import { LotteryRoundWallet } from '@/game/lottery/dto/lottery.dto';
import { SettingKey } from '@/common/const';
import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';

@Injectable()
export class LotteryService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositHistoryService: DepositHistoryService,
    private readonly settingService: SettingService,
    @InjectRepository(LotterySidePrize)
    private readonly lotterySidePrizeRepository: Repository<LotterySidePrize>,
    @InjectRepository(LotteryJackpotNumber)
    private readonly lotteryJackpotNumberRepository: Repository<LotteryJackpotNumber>,
  ) {}

  async getRoundWallet(userId: number): Promise<LotteryRoundWallet> {
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);
    const options: ('LOTTERY_1' | 'LOTTERY_2' | 'LOTTERY_3')[] = [
      'LOTTERY_1',
      'LOTTERY_2',
      'LOTTERY_3',
    ];
    const settings = await Promise.all(
      options.map(async (option) => {
        return {
          minBet: await this.settingService.getFloatSetting(
            SettingKey[`${option}_MIN_AMOUNT`],
            0.5,
          ),
          maxBet: await this.settingService.getFloatSetting(
            SettingKey[`${option}_MAX_AMOUNT`],
            100,
          ),
          jackpotMultiplier: await this.settingService.getFloatSetting(
            SettingKey[`${option}_JACKPOT_MULTIPLIER`],
            30,
          ),
          option,
          code: `${userId}L${option[option.length - 1]}`,
        };
      }),
    );
    const prizes = await this.lotterySidePrizeRepository.find();
    const currentDateUTC = dayjs().utc().format('YYYY-MM-DD');
    const jackpotNumber =
      (await this.lotteryJackpotNumberRepository.findOneBy({
        day: currentDateUTC,
      })) ?? undefined;
    return {
      settings,
      prizes,
      jackpotNumber,
      wallet: account?.binanceQrCodeUrl,
      binanceId: account?.binanceId,
      binanceUsername: account?.binanceUsername,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositHistoryService.historyPagination(
      {
        userId,
        option: In([
          DepositOption.LUCKY_NUMBER,
          DepositOption.LOTTERY_1,
          DepositOption.LOTTERY_2,
          DepositOption.LOTTERY_3,
        ]),
      },
      pagination,
    );
  }

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
    option: DepositOption,
  ): Promise<{ result: DepositResult; payout: number; meta: string }> {
    // Default values
    const defaultResult = {
      result: DepositResult.VOID,
      payout: 0,
      meta: '',
    };

    let metaData: Record<string, any> = await this.getTodayInfo();

    if (!(await this.isGameEnable(option))) {
      return defaultResult;
    }

    const minAmount = await this.getMinAmount(option);
    const maxAmount = await this.getMaxAmount(option);

    if (amount < minAmount || amount > maxAmount) return defaultResult;

    const checkedPart = this.getCheckedPart(orderId, option);

    const isHitJackpot = await this.isHitJackpot(checkedPart);
    metaData = { ...metaData, isJackpot: isHitJackpot, sizePriceId: null };
    let multiplier = 0;
    let result = DepositResult.LOSE;

    if (isHitJackpot) {
      multiplier = await this.getJackpotMultiplier(option);
      result = DepositResult.WIN;
    } else {
      const sidePrizes = await this.lotterySidePrizeRepository.find({
        where: {
          option,
        },
        order: {
          multiplier: 'DESC',
        },
      });
      for (const sidePrize of sidePrizes) {
        if (sidePrize.pattern.endsWith(checkedPart)) {
          multiplier = sidePrize.multiplier;
          result = DepositResult.WIN;
          metaData['sizePriceId'] = sidePrize.id;
          break;
        }
      }
    }

    let payout = 0;
    if (result == DepositResult.WIN) {
      payout = amount * multiplier;
    }

    return {
      result,
      payout,
      meta: JSON.stringify(metaData),
    };
  }

  private async isGameEnable(option: DepositOption): Promise<boolean> {
    let settingKey = SettingKey.ENABLE_LOTTERY_3;
    if (option == DepositOption.LOTTERY_1) {
      settingKey = SettingKey.ENABLE_LOTTERY_1;
    } else if (option == DepositOption.LOTTERY_2) {
      settingKey = SettingKey.ENABLE_LOTTERY_2;
    }
    return (await this.settingService.getSetting(settingKey, '0')) == '1';
  }

  private async getJackpotMultiplier(option: DepositOption) {
    if (option == DepositOption.LOTTERY_1) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_1_JACKPOT_MULTIPLIER,
        30,
      );
    } else if (option == DepositOption.LOTTERY_2) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_2_JACKPOT_MULTIPLIER,
        30,
      );
    } else if (option == DepositOption.LOTTERY_3) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_3_JACKPOT_MULTIPLIER,
        30,
      );
    }
    return 0;
  }

  private async getMinAmount(option: DepositOption): Promise<number> {
    if (option == DepositOption.LOTTERY_1) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_1_MIN_AMOUNT,
        0.5,
      );
    } else if (option == DepositOption.LOTTERY_2) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_2_MIN_AMOUNT,
        0.5,
      );
    } else if (option == DepositOption.LOTTERY_3) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_3_MIN_AMOUNT,
        0.5,
      );
    }
    return 0.5;
  }

  private async getMaxAmount(option: DepositOption): Promise<number> {
    if (option == DepositOption.LOTTERY_1) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_1_MAX_AMOUNT,
        1000,
      );
    } else if (option == DepositOption.LOTTERY_2) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_2_MAX_AMOUNT,
        100,
      );
    } else if (option == DepositOption.LOTTERY_3) {
      return this.settingService.getFloatSetting(
        SettingKey.LOTTERY_3_MAX_AMOUNT,
        100,
      );
    }
    return 0.5;
  }

  private async getTodayInfo(): Promise<{
    date: string;
    number: string;
  }> {
    const currentDateUTC = dayjs().utc().format('YYYY-MM-DD');
    const todayNumber = await this.lotteryJackpotNumberRepository.findOneBy({
      day: currentDateUTC,
    });
    if (!todayNumber) {
      return {
        date: currentDateUTC,
        number: '',
      };
    }
    return {
      date: currentDateUTC,
      number: todayNumber.number,
    };
  }

  private async isHitJackpot(checkedPart: string): Promise<boolean> {
    const currentDateUTC = dayjs().utc().format('YYYY-MM-DD');
    const todayNumber = await this.lotteryJackpotNumberRepository.findOneBy({
      day: currentDateUTC,
    });
    if (!todayNumber) {
      return false;
    }
    return todayNumber.number.endsWith(checkedPart);
  }

  private getCheckedPart(orderId: string, option: DepositOption): string {
    if (option == DepositOption.LOTTERY_1) {
      return orderId.substring(orderId.length - 1);
    } else if (option == DepositOption.LOTTERY_2) {
      return orderId.substring(orderId.length - 2);
    } else {
      return orderId.substring(orderId.length - 3);
    }
  }
}
