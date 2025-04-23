import { BinanceAccount } from '@/binance/binance.entity';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AdminBinanceAccountService extends TypeOrmCrudService<BinanceAccount> {
  constructor(
    @InjectRepository(BinanceAccount)
    readonly repository: Repository<BinanceAccount>,
  ) {
    super(repository);
  }
}
