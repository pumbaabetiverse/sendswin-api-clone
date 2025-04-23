import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletWithdraw } from '../wallet-withdraw.entity';

@Injectable()
export class AdminWalletWithdrawService extends TypeOrmCrudService<WalletWithdraw> {
  constructor(
    @InjectRepository(WalletWithdraw)
    readonly repository: Repository<WalletWithdraw>,
  ) {
    super(repository);
  }
}
