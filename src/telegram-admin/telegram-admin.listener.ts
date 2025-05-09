import { EventName } from '@/common/event-name';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelegramAdminService } from '@/telegram-admin/telegram-admin.service';
import { TelegramAdminNewMessageDto } from '@/telegram-admin/telegram-admin.dto';

@Injectable()
export class TelegramAdminListener {
  private readonly logger = new Logger(TelegramAdminListener.name);

  constructor(private readonly telegramAdminService: TelegramAdminService) {}

  @OnEvent(EventName.TELEGRAM_ADMIN_MESSAGE, { async: true })
  async handle(payload: TelegramAdminNewMessageDto) {
    (
      await this.telegramAdminService.sendMessage(
        payload.message,
        payload.extra,
      )
    ).mapErr((error) => this.logger.error(error.message, error.stack));
  }
}
