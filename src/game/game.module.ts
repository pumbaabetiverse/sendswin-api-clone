import { Module } from '@nestjs/common';
import { OddEvenModule } from '@/game/odd-even/odd-even.module';
import { OverUnderModule } from '@/game/over-under/over-under.module';
import { LuckySevenModule } from '@/game/lucky-seven/lucky-seven.module';
import { GameService } from '@/game/game.service';

@Module({
  imports: [OverUnderModule, LuckySevenModule, OddEvenModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
