import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deposit } from '@/deposits/deposit.entity';
import { Repository } from 'typeorm';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { BinanceHistoryDto } from '@/binance-history/binance-history.dto';

@Injectable()
export class BinanceHistoryService {
  constructor(
    @InjectRepository(Deposit)
    private readonly depositsRepository: Repository<Deposit>,
    @InjectRepository(Withdraw)
    private readonly withdrawsRepository: Repository<Withdraw>,
  ) {}

  async getHistories(
    userId: number,
    isSendOnly: boolean,
  ): Promise<BinanceHistoryDto[]> {
    const userIdStr = userId.toString();
    const deposits: BinanceHistoryDto[] = (
      await this.depositsRepository.find({
        where: {
          payerUsername: userIdStr,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 50,
      })
    ).map((deposit) => ({
      id: deposit.id,
      amount: deposit.amount,
      userId,
      type: 'send',
      createdAt: deposit.createdAt,
    }));
    if (isSendOnly) {
      return deposits;
    }
    const withdraws: BinanceHistoryDto[] = (
      await this.withdrawsRepository.find({
        where: {
          userId,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 50,
      })
    ).map((withdraw) => ({
      id: withdraw.id,
      amount: withdraw.payout,
      userId,
      type: 'receive',
      createdAt: withdraw.createdAt,
    }));
    return deposits
      .concat(withdraws)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50);
  }
}
