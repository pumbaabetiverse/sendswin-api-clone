import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Setting } from '../setting.entity';

@Injectable()
export class AdminSettingService extends TypeOrmCrudService<Setting> {
  constructor(
    @InjectRepository(Setting)
    readonly repository: Repository<Setting>,
  ) {
    super(repository);
  }
}
