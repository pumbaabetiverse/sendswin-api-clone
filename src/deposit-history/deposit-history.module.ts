import { Module } from '@nestjs/common';
import { Deposit } from '@/deposits/deposit.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit])],
  providers: [DepositHistoryService],
  exports: [DepositHistoryService],
})
export class DepositHistoryModule {}
