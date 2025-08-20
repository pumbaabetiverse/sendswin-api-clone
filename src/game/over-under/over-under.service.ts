import { BinanceService } from '@/binance/binance.service';
import { DepositOption } from '@/deposits/deposit.entity';
import { Injectable } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { In } from 'typeorm';
import { DepositHistoryService } from '@/deposit-history/deposit-history.service';

@Injectable()
export class OverUnderService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositHistoryService: DepositHistoryService,
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
    return this.depositHistoryService.historyPagination(
      { userId, option: In([DepositOption.OVER, DepositOption.UNDER]) },
      pagination,
    );
  }
}
