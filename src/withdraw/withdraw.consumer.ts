import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { Logger } from '@nestjs/common';

@Processor('withdraw')
export class WithdrawConsumer extends WorkerHost {
  private logger = new Logger(WithdrawConsumer.name);

  constructor(private withdrawService: WithdrawService) {
    super();
  }

  async process(job: Job<WithdrawRequestQueueDto, any, string>): Promise<any> {
    const res = await this.withdrawService.processUserWithdraw(
      job.data.userId,
      job.data.payout,
      job.data.sourceId,
    );
    if (res.isErr()) {
      this.logger.error(res.error.message, res.error.stack);
    }
  }
}
