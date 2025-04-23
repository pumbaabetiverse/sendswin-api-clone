import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '@/setting/setting.entity';
import { SettingService } from '@/setting/setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingModule {
}