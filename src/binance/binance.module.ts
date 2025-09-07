import { Module } from '@nestjs/common';
import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceService } from '@/binance/binance.service';
import { SettingModule } from '@/setting/setting.module';
import { CacheModule } from '@/cache/cache.module';
import { BinanceController } from '@/binance/binance.controller';

@Module({
  controllers: [BinanceController],
  imports: [
    TypeOrmModule.forFeature([BinanceAccount]),
    SettingModule,
    CacheModule,
  ],
  exports: [BinanceService],
  providers: [BinanceService],
})
export class BinanceModule {}
