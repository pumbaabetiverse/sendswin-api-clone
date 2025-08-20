import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deposit } from '@/deposits/deposit.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  buildPaginateResponse,
  PaginationQuery,
  PaginationResponse,
} from '@/common/dto/pagination.dto';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';
import { composePagination } from '@/common/pagination';

@Injectable()
export class DepositHistoryService {
  constructor(
    @InjectRepository(Deposit)
    private readonly depositsRepository: Repository<Deposit>,
  ) {}

  async historyPagination(
    options: FindOptionsWhere<Deposit> | FindOptionsWhere<Deposit>[],
    pagination: PaginationQuery,
  ): Promise<PaginationResponse<DepositWithTransactionHashDto>> {
    const { limit, skip, page } = composePagination(pagination);
    const items = (
      await this.depositsRepository
        .createQueryBuilder('deposits')
        .leftJoinAndSelect(
          'withdraws',
          'withdraw',
          "withdraw.sourceId = CONCAT('game_', deposits.orderId)",
        )
        .select([
          'deposits.*',
          'withdraw.transactionHash as "withdrawTransactionHash"',
        ])
        .where(options)
        .orderBy('deposits.transactionTime', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany()
    ).map((item: DepositWithTransactionHashDto) => ({
      ...item,
      amount: Number(item.amount || 0),
      payout: Number(item.payout || 0),
    }));
    const total = await this.depositsRepository.count({
      where: options,
      order: { transactionTime: 'DESC' },
      skip,
      take: limit,
    });
    return buildPaginateResponse(items, total, page, limit);
  }
}
