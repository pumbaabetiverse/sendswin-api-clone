import { Deposit } from '@/deposits/deposit.entity';

export class TelegramNewGameEvent {
  userChatId: string;
  deposit: Deposit;
}
