export enum WithdrawStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAIL = 'fail',
}

export enum WithdrawType {
  GAME = 'game',
  REFERRAL = 'referral',
  REFUND = 'refund',
  OTHER = 'other',
}

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
