import { Module } from '@nestjs/common';
import { OverUnderModule } from './over-under/over-under.module';

@Module({
  imports: [OverUnderModule],
})
export class GameModule {}
