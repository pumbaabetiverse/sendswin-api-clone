import { Module } from '@nestjs/common';
import { OverUnderController } from './over-under.controller';
import { BinanceModule } from '@/binance/binance.module';
import { OverUnderService } from './over-under.service';
import { DepositHistoryModule } from '@/deposit-history/deposit-history.module';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [BinanceModule, DepositHistoryModule, SettingModule],
  controllers: [OverUnderController],
  providers: [OverUnderService],
  exports: [OverUnderService],
})
export class OverUnderModule {}
