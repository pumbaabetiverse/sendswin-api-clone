import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WithdrawRequestQueueDto } from '@/withdraw/withdraw.dto';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { SettingService } from '@/setting/setting.service';
import { SettingKey } from '@/common/const';

@Processor('withdraw')
export class WithdrawConsumer extends WorkerHost {
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
      if (isEnable == 'true' || isEnable == '1')
        await this.withdrawService.processWithdrawOnChain(
          job.data.userId,
          job.data.payout,
          job.data.depositOrderId,
        );
    } catch (err) {
      console.log(err);
    }
  }
}
