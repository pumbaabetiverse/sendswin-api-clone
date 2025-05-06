import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '@/setting/setting.entity';
import { SettingService } from '@/setting/setting.service';
import { AdminSettingController } from './admin/admin.setting.controller';
import { AdminSettingService } from './admin/admin.setting.service';
import { SettingController } from './setting.controller';
import { SettingSubscriber } from './subscribers/setting.subscriber';

@Module({
  controllers: [SettingController, AdminSettingController],
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingService, AdminSettingService, SettingSubscriber],
  exports: [SettingService],
})
export class SettingModule {}
