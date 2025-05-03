import { Module } from '@nestjs/common';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { UsersModule } from '@/users/user.module';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { BlockchainModule } from '@/blockchain/blockchain.module';

import { WithdrawController } from '@/withdraw/withdraw.controller';
import { WithdrawConsumer } from '@/withdraw/withdraw.consumer';
import { AdminWithdrawService } from './services/admin.withdraw.service';
import { AdminWithdrawController } from './controllers/admin.withdraw.controller';
import { AdminWalletWithdrawService } from './services/admin.wallet-withdraw.service';
import { AdminWalletWithdrawController } from './controllers/admin.wallet-withdraw.controller';
import { SettingModule } from '@/setting/setting.module';
import { WalletWithdrawScheduler } from '@/withdraw/wallet-withdraw.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, WalletWithdraw]),
    UsersModule,
    BlockchainModule,
    SettingModule,
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
