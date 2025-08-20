import { Injectable } from '@nestjs/common';
import { LuckySevenService } from '@/game/lucky-seven/lucky-seven.service';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { DepositOption, DepositResult } from '@/deposits/deposit.entity';

@Injectable()
export class GameService {
  constructor(
    private readonly luckySevenService: LuckySevenService,
    private readonly oddEvenService: OddEvenService,
  ) {}

  async calcGameResultAndPayout(
    amount: number,
    orderId: string,
    option: DepositOption,
  ): Promise<{ result: DepositResult; payout: number }> {
    if (option == DepositOption.LUCKY_NUMBER) {
      return this.luckySevenService.calcGameResultAndPayout(amount, orderId);
    } else if (option == DepositOption.ODD || option == DepositOption.EVEN) {
      return this.oddEvenService.calcGameResultAndPayout(
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
