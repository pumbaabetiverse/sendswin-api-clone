import { Module } from '@nestjs/common';
import { SettingModule } from '@/setting/setting.module';
import { TelegramAdminService } from '@/telegram-admin/telegram-admin.service';
import { TelegramAdminListener } from '@/telegram-admin/telegram-admin.listener';

@Module({
  imports: [SettingModule],
  controllers: [],
  providers: [TelegramAdminService, TelegramAdminListener],
  exports: [TelegramAdminService],
})
export class TelegramAdminModule {}
