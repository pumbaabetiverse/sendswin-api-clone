import { Module } from '@nestjs/common';
import { BinanceModule } from '@/binance/binance.module';
import { DepositsModule } from '@/deposits/deposit.module';
import { OddEvenController } from '@/game/odd-even/odd-even.controller';
import { OddEvenService } from '@/game/odd-even/odd-even.service';

@Module({
  imports: [BinanceModule, DepositsModule],
  controllers: [OddEvenController],
  providers: [OddEvenService],
})
export class OddEvenModule {}
