import { Injectable } from '@nestjs/common';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from '@/common/event-name';
import { RefContributeEvent } from '@/referral/user-ref-circle.dto';

@Injectable()
export class UserRefCircleListener {
  constructor(private readonly userRefCircleService: UserRefCircleService) {}

  @OnEvent(EventName.REF_CONTRIBUTE)
  async handleRefContribute(payload: RefContributeEvent) {
    const amount =
      await this.userRefCircleService.calculateEarnAmountFromDeposit(
        payload.amount,
        payload.depositOption,
        payload.depositResult,
      );
    await this.userRefCircleService.addCircleContribution(
      payload.userId,
      payload.parentId,
      amount,
      payload.createdAt,
    );
  }
}
