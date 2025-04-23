import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';

@Injectable()
export class AdminUserService extends TypeOrmCrudService<User> {
  constructor(
    @InjectRepository(User)
    readonly repository: Repository<User>,
  ) {
    super(repository);
  }
}
