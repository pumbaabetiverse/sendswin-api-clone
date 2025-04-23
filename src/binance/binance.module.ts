import { Module } from '@nestjs/common';
import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceService } from '@/binance/binance.service';
import { AdminBinanceAccountService } from './services/admin.binance-account.service';
import { AdminBinanceAccountController } from './controllers/admin.binance-account.controller';

@Module({
  controllers: [AdminBinanceAccountController],
  imports: [TypeOrmModule.forFeature([BinanceAccount])],
  exports: [BinanceService],
  providers: [BinanceService, AdminBinanceAccountService],
})
export class BinanceModule {}
