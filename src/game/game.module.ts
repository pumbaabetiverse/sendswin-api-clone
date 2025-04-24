import { Module } from '@nestjs/common';
import { OverUnderModule } from './over-under/over-under.module';
import { LuckySevenModule } from './lucky-seven/lucky-seven.module';

@Module({
  imports: [OverUnderModule, LuckySevenModule],
})
export class GameModule {}
