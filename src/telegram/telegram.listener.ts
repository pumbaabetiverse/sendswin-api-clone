import { EventName } from '@/common/event-name';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelegramNewGameEvent } from '@/telegram/telegram.dto';
import { TelegramService } from '@/telegram/telegram.service';

@Injectable()
export class TelegramListener {
  constructor(private readonly telegramService: TelegramService) {}

  @OnEvent(EventName.TELEGRAM_NEW_GAME, { async: true })
  async handleTelegramNewGame(payload: TelegramNewGameEvent) {
    await this.telegramService.sendNewGameResultMessage(payload);
  }
}
