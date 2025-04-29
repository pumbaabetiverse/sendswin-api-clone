import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';

export class WithdrawUserRefCircleRequest {
  circleId: number;
}

export class WithdrawUserRefCircleResponse {
  success: boolean;
  message: string;
}

export class GetRefCircleResponse {
  userRefCircles: UserRefCircleEntity[];
  childRefCircles: UserRefCircleEntity[];
}
