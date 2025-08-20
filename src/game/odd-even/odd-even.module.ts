import { Module } from '@nestjs/common';
import { BinanceModule } from '@/binance/binance.module';
import { OddEvenController } from '@/game/odd-even/odd-even.controller';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { SettingModule } from '@/setting/setting.module';
import { DepositHistoryModule } from '@/deposit-history/deposit-history.module';

@Module({
  imports: [BinanceModule, DepositHistoryModule, SettingModule],
  controllers: [OddEvenController],
  providers: [OddEvenService],
  exports: [OddEvenService],
})
export class OddEvenModule {}
