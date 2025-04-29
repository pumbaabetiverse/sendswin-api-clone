import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';
import { Logger } from '@nestjs/common';

@Processor('withdraw')
export class WithdrawConsumer extends WorkerHost {
  private logger = new Logger(WithdrawConsumer.name);

  constructor(
    private withdrawService: WithdrawService,
    private settingService: SettingService,
  ) {
    super();
  }

  async process(job: Job<WithdrawRequestQueueDto, any, string>): Promise<any> {
    try {
      const isEnable = await this.settingService.getSetting(
        SettingKey.ENABLE_USER_WITHDRAW,
        'false',
      );
      if (isEnable == 'true' || isEnable == '1') {
        if (job.data.depositOrderId) {
          await this.withdrawService.processWithdrawOnChain(
            job.data.userId,
            job.data.payout,
            job.data.depositOrderId,
          );
        } else if (job.data.userRefCircleId) {
          await this.withdrawService.processRefWithdrawOnChain(
            job.data.userId,
            job.data.payout,
            job.data.userRefCircleId,
          );
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(err.message, err.stack);
      }
    }
  }
}
