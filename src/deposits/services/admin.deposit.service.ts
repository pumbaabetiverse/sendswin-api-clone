import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit } from '../deposit.entity';

@Injectable()
export class AdminDepositService extends TypeOrmCrudService<Deposit> {
  constructor(
    @InjectRepository(Deposit)
    readonly repository: Repository<Deposit>,
  ) {
    super(repository);
  }
}
