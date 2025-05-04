import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdraw } from '../withdraw.entity';
import { WithdrawService } from '@/withdraw/withdraw.service';
import {
  createWithdrawSourceId,
  WithdrawType,
} from '@/withdraw/withdraw.domain';
import { Result } from 'neverthrow';

@Injectable()
export class AdminWithdrawService extends TypeOrmCrudService<Withdraw> {
  constructor(
    @InjectRepository(Withdraw)
    private readonly repository: Repository<Withdraw>,
    private readonly withdrawService: WithdrawService,
  ) {
    super(repository);
  }

  async refundUser(
    userId: number,
    payout: number,
    txId: string,
  ): Promise<Result<void, Error>> {
    return await this.withdrawService.processUserWithdraw(
      userId,
      payout,
      createWithdrawSourceId(WithdrawType.REFUND, txId),
    );
  }
}
