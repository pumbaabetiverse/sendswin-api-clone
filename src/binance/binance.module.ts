import { Module } from '@nestjs/common';
import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceService } from '@/binance/binance.service';

@Module({
  imports: [TypeOrmModule.forFeature([BinanceAccount])],
  exports: [BinanceService],
  providers: [BinanceService],
})
export class BinanceModule {}
