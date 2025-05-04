import { WithdrawType } from '@/withdraw/withdraw.entity';

export const createWithdrawSourceId = (
  withdrawType: WithdrawType,
  id: number | string,
) => {
  return `${withdrawType}_${id}`;
};

export const getWithdrawTypeFromSourceId = (sourceId: string): WithdrawType => {
  if (sourceId.startsWith(WithdrawType.GAME)) {
    return WithdrawType.GAME;
  }
  if (sourceId.startsWith(WithdrawType.REFERRAL)) {
    return WithdrawType.REFERRAL;
  }
  return WithdrawType.OTHER;
};
