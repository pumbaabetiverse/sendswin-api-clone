// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { TelegramMessage } from '@/telegram/telegram.dto';
import { Result } from 'neverthrow';
import { Message } from 'telegraf/typings/core/types/typegram';
import { fromPromiseResult } from '@/common/errors';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

@Injectable()
export class TelegramService {
  private logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private bot: Telegraf,
    @InjectQueue('telegram-message-queue')
    private readonly telegramMessageQueue: Queue<TelegramMessage>,
  ) {}

  async pushSendMessageQueue(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
    delay: number = 0,
  ): Promise<Result<Job<TelegramMessage>, Error>> {
    return fromPromiseResult(
      this.telegramMessageQueue.add(
        'send-message',
        {
          chatId,
          message,
          extra,
        },
        {
          delay,
        },
      ),
    );
  }

  async sendMessage(
    chatId: number,
    message: string,
    extra: ExtraReplyMessage = {},
  ): Promise<Result<Message.TextMessage, Error>> {
    return fromPromiseResult(
      this.bot.telegram.sendMessage(chatId, message, extra),
    );
  }
}
