import { Inject, Injectable } from '@nestjs/common';
import { LuckySevenService } from '@/game/lucky-seven/lucky-seven.service';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { LotteryService } from '@/game/lottery/lottery.service';
import { OverUnderService } from '@/game/over-under/over-under.service';
import { BinanceService } from '@/binance/binance.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';
import { Repository } from 'typeorm';
import { SettingService } from '@/setting/setting.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';
import { EventName } from '@/common/event-name';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { GameWalletDto } from '@/game/game.dto';
import { SettingKey } from '@/common/const';
import dayjs from 'dayjs';

@Injectable()
export class GameService {
  constructor(
    private readonly luckySevenService: LuckySevenService,
    private readonly oddEvenService: OddEvenService,
    private readonly lotteryService: LotteryService,
    private readonly overUnderService: OverUnderService,
    private readonly binanceService: BinanceService,
    private readonly settingService: SettingService,
    private readonly depositHistoryService: DepositHistoryService,
    @InjectRepository(LotterySidePrize)
    private readonly lotterySidePrizeRepository: Repository<LotterySidePrize>,
    @InjectRepository(LotteryJackpotNumber)
    private readonly lotteryJackpotNumberRepository: Repository<LotteryJackpotNumber>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cron('0 0 * * *')
  async resetCacheWalletDaily() {
    return this.resetCacheWallet();
  }

  @OnEvent(EventName.CACHE_RESET_GAME_WALLET, { async: true })
  async resetCacheWallet() {
    await this.cacheManager.del('game_wallet');
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositHistoryService.historyPagination({ userId }, pagination);
  }

  async getWallet(): Promise<GameWalletDto> {
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);

    const [
      oddEvenMinBet,
      oddEvenMaxBet,
      oddMultiplier,
      evenMultiplier,
      overUnderMinBet,
      overUnderMaxBet,
      overMultiplier,
      underMultiplier,
      lottery1MinBet,
      lottery1MaxBet,
      lottery1JackpotMultiplier,
    ] = await Promise.all([
      this.settingService.getFloatSetting(SettingKey.ODD_EVEN_MIN_AMOUNT, 1),
      this.settingService.getFloatSetting(SettingKey.ODD_EVEN_MAX_AMOUNT, 1),
      this.settingService.getFloatSetting(SettingKey.ODD_MULTIPLIER, 1),
      this.settingService.getFloatSetting(SettingKey.EVEN_MULTIPLIER, 1),
      this.settingService.getFloatSetting(SettingKey.OVER_UNDER_MIN_AMOUNT, 1),
      this.settingService.getFloatSetting(SettingKey.OVER_UNDER_MAX_AMOUNT, 1),
      this.settingService.getFloatSetting(SettingKey.OVER_MULTIPLIER, 1),
      this.settingService.getFloatSetting(SettingKey.UNDER_MULTIPLIER, 1),
      this.settingService.getFloatSetting(SettingKey.LOTTERY_1_MIN_AMOUNT, 1),
      this.settingService.getFloatSetting(SettingKey.LOTTERY_1_MAX_AMOUNT, 1),

      this.settingService.getFloatSetting(
        SettingKey.LOTTERY_1_JACKPOT_MULTIPLIER,
        1,
      ),
    ]);

    const prizes = await this.lotterySidePrizeRepository.find();
    const currentDateUTC = dayjs().utc().format('YYYY-MM-DD');
    const jackpotNumber =
      (await this.lotteryJackpotNumberRepository.findOneBy({
        day: currentDateUTC,
      })) ?? undefined;

    return {
      binanceId: account?.binanceId,
      binanceUsername: account?.binanceUsername,
      lottery1: {
        minBet: lottery1MinBet,
        maxBet: lottery1MaxBet,
        jackpotMultiplier: lottery1JackpotMultiplier,
        prizes,
        jackpotNumber,
      },
      oddEven: {
        minBet: oddEvenMinBet,
        maxBet: oddEvenMaxBet,
        oddMultiplier: oddMultiplier,
        evenMultiplier: evenMultiplier,
      },
      overUnder: {
        minBet: overUnderMinBet,
        maxBet: overUnderMaxBet,
        overMultiplier: overMultiplier,
        underMultiplier: underMultiplier,
      },
    };
  }

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
    option: DepositOption,
  ): Promise<{ result: DepositResult; payout: number; meta?: object }> {
    if (option == DepositOption.LUCKY_NUMBER) {
      return this.luckySevenService.calcGameResultAndPayout(amount, orderId);
    } else if (option == DepositOption.ODD || option == DepositOption.EVEN) {
      return this.oddEvenService.calcGameResultAndPayout(
        amount,
        orderId,
        option,
      );
    } else if (
      option == DepositOption.LOTTERY_1 ||
      option == DepositOption.LOTTERY_2 ||
      option == DepositOption.LOTTERY_3
    ) {
      return this.lotteryService.calcGameResultAndPayout(
        amount,
        orderId,
        option,
      );
    } else if (option == DepositOption.OVER || option == DepositOption.UNDER) {
      return await this.overUnderService.calcGameResultAndPayout(
        amount,
        orderId,
        option,
      );
    }
    return {
      result: DepositResult.VOID,
      payout: 0,
    };
  }
}
