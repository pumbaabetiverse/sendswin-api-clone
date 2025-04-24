import { BinanceService } from '@/binance/binance.service';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { DepositOption } from '@/deposits/deposit.entity';
import { DepositsService } from '@/deposits/deposit.service';
import { Injectable } from '@nestjs/common';
import { LuckySevenRoundWallet } from './dto/lucky-seven.dto';
import { In } from 'typeorm';

@Injectable()
export class LuckySevenService {
  constructor(
    private readonly binanceService: BinanceService,
    private readonly depositsService: DepositsService,
  ) {}

  async getRoundWallet(): Promise<LuckySevenRoundWallet> {
    const wallet = await this.binanceService.getRandomActiveBinanceAccount(
      DepositOption.LUCKY_NUMBER,
    );
    return {
      binanceQrCodeUrl: wallet?.binanceQrCodeUrl,
    };
  }

  async getHistory(userId: number, pagination: PaginationQuery) {
    return this.depositsService.historyPagination(
      { userId, option: In([DepositOption.LUCKY_NUMBER]) },
      pagination,
    );
  }
}
