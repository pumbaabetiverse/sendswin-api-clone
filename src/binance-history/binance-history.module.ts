import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from '@/deposits/deposit.entity';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { BinanceHistoryService } from '@/binance-history/binance-history.service';
import { BinanceHistoryController } from '@/binance-history/binance-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit, Withdraw])],
  providers: [BinanceHistoryService],
  controllers: [BinanceHistoryController],
  exports: [],
})
export class BinanceHistoryModule {}
