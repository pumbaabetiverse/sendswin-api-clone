import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DepositProcessQueueDto } from '@/deposits/deposit.dto';
import { DepositsService } from '@/deposits/deposit.service';
import { Logger, OnApplicationShutdown } from '@nestjs/common';

@Processor('deposit-process')
export class DepositConsumer
  extends WorkerHost
  implements OnApplicationShutdown
{
  private logger = new Logger(DepositConsumer.name);

  constructor(private depositsService: DepositsService) {
    super();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.debug(
      `Gracefully closing deposit queue worker (signal: ${signal})`,
    );

    // Close the worker gracefully, allowing current jobs to finish
    await this.worker.close();
    this.logger.debug('Deposit queue worker closed successfully');
  }

  async process(job: Job<DepositProcessQueueDto, any, string>): Promise<any> {
    await this.depositsService.processDepositItem(job.data);
  }
}
