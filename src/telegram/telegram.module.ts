import { Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { SettingModule } from '@/setting/setting.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    SettingModule,
    BullModule.registerQueue({
      name: 'telegram-message-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
