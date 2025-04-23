import { CrudRequest } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { Repository } from 'typeorm';
import {
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../dto/admin-user.dto';
import { AdminUser } from '../entities/admin-user.entity';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/common/types';
@Injectable()
export class AdminAdminUserService extends TypeOrmCrudService<AdminUser> {
  constructor(
    @InjectRepository(AdminUser)
    readonly repository: Repository<AdminUser>,
    readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    super(repository);
  }

  async createOneAdmin(req: CrudRequest, dto: CreateAdminUserRequest) {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new BadRequestException('Secret not found');
    }
    const password = await argon2.hash(dto.password, {
      secret: Buffer.from(secret),
    });
    dto.password = password;
    return this.createOne(req, dto);
  }

  async updateOneAdmin(req: CrudRequest, dto: UpdateAdminUserRequest) {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new BadRequestException('Secret not found');
    }
    if (dto.password) {
      const password = await argon2.hash(dto.password, {
        secret: Buffer.from(secret),
      });
      dto.password = password;
    }
    return this.updateOne(req, dto);
  }
}
