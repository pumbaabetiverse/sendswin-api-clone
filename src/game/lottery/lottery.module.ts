import { Module } from '@nestjs/common';
import { LotteryController } from '@/game/lottery/lottery.controller';
import { LotteryService } from '@/game/lottery/lottery.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';
import { BinanceModule } from '@/binance/binance.module';
import { DepositHistoryModule } from '@/deposit-history/deposit-history.module';
import { SettingModule } from '@/setting/setting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LotteryJackpotNumber, LotterySidePrize]),
    BinanceModule,
    DepositHistoryModule,
    SettingModule,
  ],
  controllers: [LotteryController],
  providers: [LotteryService],
  exports: [LotteryService],
})
export class LotteryModule {}
