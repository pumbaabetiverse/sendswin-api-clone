import { Module } from '@nestjs/common';
import { OddEvenModule } from '@/game/odd-even/odd-even.module';
import { OverUnderModule } from '@/game/over-under/over-under.module';
import { LuckySevenModule } from '@/game/lucky-seven/lucky-seven.module';
import { GameService } from '@/game/game.service';
import { LotteryModule } from '@/game/lottery/lottery.module';
import { SettingModule } from '@/setting/setting.module';
import { BinanceModule } from '@/binance/binance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LotteryJackpotNumber,
  LotterySidePrize,
} from '@/game/lottery/lottery.entity';
import { GameController } from '@/game/game.controller';
import { DepositHistoryModule } from '@/deposit-history/deposit-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LotteryJackpotNumber, LotterySidePrize]),
    OverUnderModule,
    LuckySevenModule,
    OddEvenModule,
    LotteryModule,
    SettingModule,
    BinanceModule,
    DepositHistoryModule,
  ],
  providers: [GameService],
  exports: [GameService],
  controllers: [GameController],
})
export class GameModule {}
