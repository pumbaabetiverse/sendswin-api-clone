import { Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [SettingModule],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
