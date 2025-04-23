import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { Controller, Post } from '@nestjs/common';

@Controller('deposits')
export class DepositController {
  constructor(
    @InjectQueue('withdraw')
    private withdrawQueue: Queue<WithdrawRequestQueueDto>,
  ) {}

  @Post('')
  async test() {
    await this.withdrawQueue.add('withdraw', {
      userId: 100001,
      payout: 1,
      depositOrderId: '1',
    });
    return { message: 'ok' };
  }
}
