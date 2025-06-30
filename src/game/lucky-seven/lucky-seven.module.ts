import { Module } from '@nestjs/common';
import { LuckySevenController } from './lucky-seven.controller';
import { BinanceModule } from '@/binance/binance.module';
import { LuckySevenService } from './lucky-seven.service';
import { DepositsModule } from '@/deposits/deposit.module';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [BinanceModule, DepositsModule, SettingModule],
  controllers: [LuckySevenController],
  providers: [LuckySevenService],
})
export class LuckySevenModule {}
