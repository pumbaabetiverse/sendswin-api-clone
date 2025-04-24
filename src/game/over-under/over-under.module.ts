import { Module } from '@nestjs/common';
import { OverUnderController } from './over-under.controller';
import { BinanceModule } from '@/binance/binance.module';
import { OverUnderService } from './over-under.service';

@Module({
  imports: [BinanceModule],
  controllers: [OverUnderController],
  providers: [OverUnderService],
})
export class OverUnderModule {}
