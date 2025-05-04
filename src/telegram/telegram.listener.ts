import { EventName } from '@/common/event-name';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TelegramNewGameEvent,
  TelegramWithdrawProcessingEvent,
} from '@/telegram/telegram.dto';
import { TelegramService } from '@/telegram/telegram.service';

@Injectable()
export class TelegramListener {
  private readonly logger = new Logger(TelegramListener.name);

  constructor(private readonly telegramService: TelegramService) {}

  @OnEvent(EventName.TELEGRAM_NEW_GAME, { async: true })
  async handleTelegramNewGame(payload: TelegramNewGameEvent) {
    (await this.telegramService.sendNewGameResultMessage(payload)).mapErr(
      (error) => this.logger.error(error.message, error.stack),
    );
  }

  @OnEvent(EventName.TELEGRAM_WITHDRAW_PROCESSING, { async: true })
  async handleTelegramWithdrawProcessing(
    payload: TelegramWithdrawProcessingEvent,
  ) {
    (
      await this.telegramService.sendWithdrawalSuccessMessage(
        Number(payload.userChatId),
        payload.payout,
        payload.txHash,
        payload.network,
      )
    ).mapErr((error) => this.logger.error(error.message, error.stack));
  }
}
