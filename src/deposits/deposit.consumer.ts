import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DepositProcessQueueDto } from '@/deposits/deposit.dto';
import { DepositsService } from '@/deposits/deposit.service';
import { Logger } from '@nestjs/common';

@Processor('deposit-process')
export class DepositConsumer extends WorkerHost {
  private logger = new Logger(DepositConsumer.name);

  constructor(private depositsService: DepositsService) {
    super();
  }

  async process(job: Job<DepositProcessQueueDto, any, string>): Promise<any> {
    await this.depositsService.processDepositItem(job.data);
  }
}
