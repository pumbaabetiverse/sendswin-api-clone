import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { WithdrawService } from '@/withdraw/withdraw.service';

@Processor('withdraw')
export class WithdrawConsumer extends WorkerHost {
  constructor(private withdrawService: WithdrawService) {
    super();
  }

  async process(job: Job<WithdrawRequestQueueDto, any, string>): Promise<any> {
    await this.withdrawService.processWithdrawOnChain(
      job.data.userId,
      job.data.payout,
      job.data.depositOrderId,
    );
  }
}
