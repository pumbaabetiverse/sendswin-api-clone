import { Module } from '@nestjs/common';
import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinanceService } from '@/binance/binance.service';
import { AdminBinanceAccountService } from './services/admin.binance-account.service';
import { AdminBinanceAccountController } from './controllers/admin.binance-account.controller';
import { SettingModule } from '@/setting/setting.module';
import { BinanceScheduler } from '@/binance/binance.scheduler';
import { CacheModule } from '@/cache/cache.module';
import { TelegramAdminModule } from '@/telegram-admin/telegram-admin.module';
import { BinanceProxyService } from '@/binance/binance-proxy.service';

@Module({
  controllers: [AdminBinanceAccountController],
  imports: [
    TypeOrmModule.forFeature([BinanceAccount]),
    SettingModule,
    CacheModule,
    TelegramAdminModule,
  ],
  exports: [BinanceService],
  providers: [
    BinanceService,
    AdminBinanceAccountService,
    BinanceScheduler,
    BinanceProxyService,
  ],
})
export class BinanceModule {}
