import { BinanceService } from '@/binance/binance.service';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { DepositsService } from '@/deposits/deposit.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';
import { OddEvenRoundWallet } from '@/game/odd-even/dto/odd-even.dto';

@Injectable()
export class OddEvenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositsService: DepositsService,
  ) {}

  async getRoundWallet(): Promise<OddEvenRoundWallet> {
    const [oddAccount, evenAccount] = await Promise.all([
      this.binanceService.getRandomActiveBinanceAccount(DepositOption.ODD),
      this.binanceService.getRandomActiveBinanceAccount(DepositOption.EVEN),
    ]);
    return {
      oddWallet: oddAccount?.binanceQrCodeUrl,
      evenWallet: evenAccount?.binanceQrCodeUrl,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.ODD, DepositOption.EVEN]) },
      pagination,
    );
  }
}
