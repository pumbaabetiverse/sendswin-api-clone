import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

export class TelegramMessage {
  chatId: number;
  message: string;
  extra: ExtraReplyMessage = {};
}
