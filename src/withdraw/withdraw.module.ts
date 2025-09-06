import { Module } from '@nestjs/common';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { UsersModule } from '@/users/user.module';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';

import { WithdrawConsumer } from '@/withdraw/withdraw.consumer';
import { SettingModule } from '@/setting/setting.module';
import { NotificationModule } from '@/notification/notification.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { WithdrawNotificationService } from '@/withdraw/withdraw-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, WalletWithdraw]),
    UsersModule,
    SettingModule,
    NotificationModule,
    TelegramModule,
  ],
  exports: [WithdrawService],
  providers: [WithdrawService, WithdrawConsumer, WithdrawNotificationService],
  controllers: [],
})
export class WithdrawModule {}
