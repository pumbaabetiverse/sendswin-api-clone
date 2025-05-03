import { DepositOption, DepositResult } from '@/deposits/deposit.entity';
import { BlockchainNetwork } from '@/common/const';

export class TelegramNewGameEvent {
  userChatId: string;
  orderId: string;
  amount: number;
  payout: number;
  option: DepositOption;
  result: DepositResult;
}

export class TelegramWithdrawProcessingEvent {
  userChatId: string;
  payout: number;
  txHash: string;
  network: BlockchainNetwork;
}
