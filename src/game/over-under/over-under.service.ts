import { BinanceService } from '@/binance/binance.service';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';
import { DepositsService } from '@/deposits/deposit.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';

@Injectable()
export class OverUnderService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositsService: DepositsService,
  ) {}

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

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.OVER, DepositOption.OVER]) },
      pagination,
    );
  }
}
