import { Module } from '@nestjs/common';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { UsersModule } from '@/users/user.module';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { BlockchainModule } from '@/blockchain/blockchain.module';

import { WithdrawController } from '@/withdraw/withdraw.controller';
import { WithdrawConsumer } from '@/withdraw/withdraw.consumer';
import { SettingModule } from '@/setting/setting.module';
import { WalletWithdrawScheduler } from '@/withdraw/wallet-withdraw.scheduler';
import { AdminWithdrawService } from '@/withdraw/services/admin.withdraw.service';
import { AdminWalletWithdrawService } from '@/withdraw/services/admin.wallet-withdraw.service';
import { AdminWithdrawController } from '@/withdraw/controllers/admin.withdraw.controller';
import { AdminWalletWithdrawController } from '@/withdraw/controllers/admin.wallet-withdraw.controller';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, WalletWithdraw]),
    UsersModule,
    BlockchainModule,
    SettingModule,
    NotificationModule,
  ],
  exports: [WithdrawService],
  providers: [
    WithdrawService,
    WithdrawConsumer,
    WalletWithdrawScheduler,
    AdminWithdrawService,
    AdminWalletWithdrawService,
  ],
  controllers: [
    WithdrawController,
    AdminWithdrawController,
    AdminWalletWithdrawController,
  ],
})
export class WithdrawModule {}
