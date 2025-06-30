// src/deposits/deposits.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from '@/deposits/deposit.entity';
import { DepositsService } from '@/deposits/deposit.service';
import { DepositsScheduler } from '@/deposits/deposit.scheduler';
import { UsersModule } from '@/users/user.module';
import { BullModule } from '@nestjs/bullmq';
import { BinanceModule } from '@/binance/binance.module';
import { SettingModule } from '@/setting/setting.module';
import { AdminDepositController } from '@/deposits/controllers/admin.deposit.controller';
import { AdminDepositService } from '@/deposits/services/admin.deposit.service';
import { CacheModule } from '@/cache/cache.module';
import { NotificationModule } from '@/notification/notification.module';
import { DepositNotificationService } from '@/deposits/deposit-notification.service';
import { TelegramModule } from '@/telegram/telegram.module';
import { TelegramAdminModule } from '@/telegram-admin/telegram-admin.module';

@Module({
  controllers: [AdminDepositController],
  imports: [
    TypeOrmModule.forFeature([Deposit]),
    UsersModule,
    BinanceModule,
    SettingModule,
    BullModule.registerQueue({
      name: 'withdraw',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TelegramModule,
    TelegramAdminModule,
    CacheModule,
    NotificationModule,
  ],
  providers: [
    DepositsService,
    DepositsScheduler,
    AdminDepositService,
    DepositNotificationService,
  ],
  exports: [DepositsService],
})
export class DepositsModule {}
