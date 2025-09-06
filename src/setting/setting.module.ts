import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '@/setting/setting.entity';
import { SettingService } from '@/setting/setting.service';
import { SettingController } from './setting.controller';
import { SettingSubscriber } from './subscribers/setting.subscriber';

@Module({
  controllers: [SettingController],
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingService, SettingSubscriber],
  exports: [SettingService],
})
export class SettingModule {}
