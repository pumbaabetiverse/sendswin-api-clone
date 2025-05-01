import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { UsersModule } from '@/users/user.module';
import { SettingModule } from '@/setting/setting.module';
import { BullModule } from '@nestjs/bullmq';
import { UserRefCircleController } from '@/referral/user-ref-circle.controller';
import { UserRefCircleListener } from '@/referral/user-ref-circle.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRefCircleEntity]),
    UsersModule,
    SettingModule,
    BullModule.registerQueue({
      name: 'withdraw',
    }),
  ],
  controllers: [UserRefCircleController],
  providers: [UserRefCircleService, UserRefCircleListener],
  exports: [UserRefCircleService],
})
export class UserRefCircleModule {}
