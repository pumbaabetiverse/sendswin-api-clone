import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdraw } from '../withdraw.entity';

@Injectable()
export class AdminWithdrawService extends TypeOrmCrudService<Withdraw> {
  constructor(
    @InjectRepository(Withdraw)
    readonly repository: Repository<Withdraw>,
  ) {
    super(repository);
  }
}
