import { Module } from '@nestjs/common';
import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceService } from '@/binance/binance.service';
import { AdminBinanceAccountService } from './services/admin.binance-account.service';
import { AdminBinanceAccountController } from './controllers/admin.binance-account.controller';
import { SettingModule } from '@/setting/setting.module';
import { BinanceScheduler } from '@/binance/binance.scheduler';
import { CacheModule } from '@/cache/cache.module';

@Module({
  controllers: [AdminBinanceAccountController],
  imports: [
    TypeOrmModule.forFeature([BinanceAccount]),
    SettingModule,
    CacheModule,
  ],
  exports: [BinanceService],
  providers: [BinanceService, AdminBinanceAccountService, BinanceScheduler],
})
export class BinanceModule {}
