// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { Telegraf } from 'telegraf';
import { SettingService } from '@/setting/setting.service';
import { Result } from 'neverthrow';
import { Message } from 'telegraf/typings/core/types/typegram';
import { fromPromiseResult, fromSyncResult } from '@/common/errors';
import { SettingKey } from '@/common/const';
import { EventName } from '@/common/event-name';
import { TelegramAdminNewMessageDto } from '@/telegram-admin/telegram-admin.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/common/types';

@Injectable()
export class TelegramAdminService {
  private readonly bot: Telegraf;
  private readonly logger = new Logger(TelegramAdminService.name);

  constructor(
    private readonly settingService: SettingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const token = this.configService.get<string>('TELEGRAM_ADMIN_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_ADMIN_BOT_TOKEN is not set');
    }
    this.bot = new Telegraf(token);
    this.bot.launch().catch((error) => {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    });
  }

  notify(message: string) {
    return fromSyncResult(() =>
      this.eventEmitter.emit(EventName.TELEGRAM_ADMIN_MESSAGE, {
        message,
        extra: {},
      } satisfies TelegramAdminNewMessageDto),
    );
  }

  async sendMessage(
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<Result<Message.TextMessage, Error>> {
    const chatId = await this.settingService.getNumberSetting(
      SettingKey.TELEGRAM_ADMIN_CHAT_ID,
      -4637646206,
    );
    return fromPromiseResult(
      this.bot.telegram.sendMessage(chatId, message, extra),
      'Error send message',
    );
  }
}
