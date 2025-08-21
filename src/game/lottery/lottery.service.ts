import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In, Repository } from 'typeorm';
import { DepositOption } from '@/deposits/deposit.entity';
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
    const result = await this.binanceService.getCurrentRotateAccount();
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
      wallet: result.unwrapOr(null)?.binanceQrCodeUrl,
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
}
