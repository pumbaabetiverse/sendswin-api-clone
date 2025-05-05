import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';

export class WithdrawUserRefCircleRequest {
  circleId: number;
}

export class GetAggregateUserRefResponse {
  childCount: number;
  totalEarned: number;
}

export class RefContributeEvent {
  userId: number;
  parentId: number;
  amount: number;
  createdAt: Date;
  depositOption: DepositOption;
  depositResult: DepositResult;
}

export class UserRefCircleEntityExt extends UserRefCircleEntity {
  telegramFullName?: string;
}
