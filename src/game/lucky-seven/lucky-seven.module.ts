import { Module } from '@nestjs/common';
import { LuckySevenController } from './lucky-seven.controller';
import { BinanceModule } from '@/binance/binance.module';
import { LuckySevenService } from './lucky-seven.service';
import { SettingModule } from '@/setting/setting.module';
import { DepositHistoryModule } from '@/deposit-history/deposit-history.module';

@Module({
  imports: [BinanceModule, DepositHistoryModule, SettingModule],
  controllers: [LuckySevenController],
  providers: [LuckySevenService],
  exports: [LuckySevenService],
})
export class LuckySevenModule {}
