import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

export class TelegramAdminNewMessageDto {
  message: string;
  extra: ExtraReplyMessage = {};
}
