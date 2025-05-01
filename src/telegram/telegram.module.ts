import { Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { SettingModule } from '@/setting/setting.module';
import { TelegramListener } from '@/telegram/telegram.listener';

@Module({
  imports: [SettingModule],
  providers: [TelegramService, TelegramUpdate, TelegramListener],
  exports: [TelegramService],
})
export class TelegramModule {}
