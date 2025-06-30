import { Module } from '@nestjs/common';
import { BinanceModule } from '@/binance/binance.module';
import { DepositsModule } from '@/deposits/deposit.module';
import { OddEvenController } from '@/game/odd-even/odd-even.controller';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [BinanceModule, DepositsModule, SettingModule],
  controllers: [OddEvenController],
  providers: [OddEvenService],
})
export class OddEvenModule {}
