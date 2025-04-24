import { BinanceService } from '@/binance/binance.service';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';

@Injectable()
export class OverUnderService {
  constructor(private readonly binanceService: BinanceService) {}

  async getRoundWallet(): Promise<OverUnderRoundWallet> {
    const [overAccount, userAccount] = await Promise.all([
      this.binanceService.getRandomActiveBinanceAccount(DepositOption.OVER),
      this.binanceService.getRandomActiveBinanceAccount(DepositOption.UNDER),
    ]);
    return {
      overWallet: overAccount?.binanceQrCodeUrl,
      underWallet: userAccount?.binanceQrCodeUrl,
    };
  }
}
