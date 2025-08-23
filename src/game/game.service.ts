import { Injectable } from '@nestjs/common';
import { LuckySevenService } from '@/game/lucky-seven/lucky-seven.service';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { LotteryService } from '@/game/lottery/lottery.service';
import { OverUnderService } from '@/game/over-under/over-under.service';

@Injectable()
export class GameService {
  constructor(
    private readonly luckySevenService: LuckySevenService,
    private readonly oddEvenService: OddEvenService,
    private readonly lotteryService: LotteryService,
    private readonly overUnderService: OverUnderService,
  ) {}

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
    option: DepositOption,
  ): Promise<{ result: DepositResult; payout: number; meta: string }> {
    if (option == DepositOption.LUCKY_NUMBER) {
      return {
        ...(await this.luckySevenService.calcGameResultAndPayout(
          amount,
          orderId,
        )),
        meta: '',
      };
    } else if (option == DepositOption.ODD || option == DepositOption.EVEN) {
      return {
        ...(await this.oddEvenService.calcGameResultAndPayout(
          amount,
          orderId,
          option,
        )),
        meta: '',
      };
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
      return {
        ...(await this.overUnderService.calcGameResultAndPayout(
          amount,
          orderId,
          option,
        )),
        meta: '',
      };
    }
    return {
      result: DepositResult.VOID,
      payout: 0,
      meta: '',
    };
  }
}
