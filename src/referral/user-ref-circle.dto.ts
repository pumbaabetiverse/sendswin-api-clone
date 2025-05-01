import { DepositOption, DepositResult } from '@/deposits/deposit.entity';

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
