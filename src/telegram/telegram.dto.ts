import { DepositOption, DepositResult } from '@/deposits/deposit.entity';

export class TelegramNewGameEvent {
  userChatId: string;
  orderId: string;
  amount: number;
  payout: number;
  option: DepositOption;
  result: DepositResult;
}
