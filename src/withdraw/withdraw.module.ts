import { forwardRef, Module } from '@nestjs/common';
import { WithdrawService } from '@/withdraw/withdraw.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { UsersModule } from '@/users/user.module';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { BlockchainModule } from '@/blockchain/blockchain.module';
import { TelegramModule } from '@/telegram/telegram.module';

import { WithdrawController } from '@/withdraw/withdraw.controller';
import { WithdrawConsumer } from '@/withdraw/withdraw.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, WalletWithdraw]),
    UsersModule,
    BlockchainModule,
    forwardRef(() => TelegramModule),
  ],
  exports: [WithdrawService],
  providers: [WithdrawService, WithdrawConsumer],
  controllers: [WithdrawController],
})
export class WithdrawModule {}
