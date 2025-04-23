import { WithdrawService } from '@/withdraw/withdraw.service';
import { Controller, Post } from '@nestjs/common';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Post('')
  async withdraw() {
    // const userId = 100001;
    // const payout = 1;
    // const depositOrderId = '1';
    // await this.withdrawService.processWithdrawOnChain(
    //   userId,
    //   payout,
    //   depositOrderId,
    // );

    return { message: 'ok' };
  }
}
