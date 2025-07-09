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
    const account = (
      await this.binanceService.getCurrentRotateAccount()
    ).unwrapOr(null);
    return {
      overWallet: account?.binanceQrCodeUrl,
      underWallet: account?.binanceQrCodeUrl,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.OVER, DepositOption.UNDER]) },
      pagination,
    );
  }
}
