import { Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [SettingModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
