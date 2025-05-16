import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { Job } from 'bullmq';
import { TelegramMessage } from '@/telegram/telegram.dto';

@Processor('telegram-message-queue', {
  concurrency: 50,
})
export class TelegramProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(private readonly telegramService: TelegramService) {
    super();
  }

  async process(job: Job<TelegramMessage>): Promise<any> {
    (
      await this.telegramService.sendMessage(
        job.data.chatId,
        job.data.message,
        job.data.extra,
      )
    ).mapErr((error) => this.logger.error(error.message, error.stack));
  }
}
