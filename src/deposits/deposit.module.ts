// src/deposits/deposits.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from '@/deposits/deposit.entity';
import { DepositsService } from '@/deposits/deposit.service';
import { DepositsScheduler } from '@/deposits/deposit.scheduler';
import { DepositConsumer } from '@/deposits/deposit.consumer';
import { UsersModule } from '@/users/user.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { BullModule } from '@nestjs/bullmq';
import { BinanceModule } from '@/binance/binance.module';
import { SettingModule } from '@/setting/setting.module';
import { AdminDepositController } from '@/deposits/controllers/admin.deposit.controller';
import { AdminDepositService } from '@/deposits/services/admin.deposit.service';

@Module({
  controllers: [AdminDepositController],
  imports: [
    TypeOrmModule.forFeature([Deposit]),
    UsersModule,
    forwardRef(() => TelegramModule), // Add forwardRef here
    BinanceModule,
    SettingModule,
    BullModule.registerQueue({
      name: 'withdraw',
    }),
    BullModule.registerQueue({
      name: 'deposit-process',
    }),
  ],
  providers: [
    DepositsService,
    DepositsScheduler,
    DepositConsumer,
    AdminDepositService,
  ],
  exports: [DepositsService],
})
export class DepositsModule {}
