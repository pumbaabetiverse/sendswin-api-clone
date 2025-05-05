import { AdminLoginPayloadDto } from '@/auth/auth.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { Equal, Repository } from 'typeorm';
import { UpdateAdminInfoRequest } from '../dto/admin-user.dto';
import { AdminUser } from '../entities/admin-user.entity';
import { EnvironmentVariables } from '@/common/types';
import { err, ok, Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class AdminUserService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  onModuleInit() {
    //
  }

  async verify(data: AdminLoginPayloadDto): Promise<Result<AdminUser, Error>> {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      return err(new BadRequestException('Secret not found'));
    }
    const user = await this.repository.findOne({
      where: { username: Equal(data.username) },
      select: ['id', 'password', 'suspended'],
    });
    if (!user) {
      return err(new NotFoundException('Username or password does not match'));
    }
    const match = await argon2.verify(user.password, data.password, {
      secret: Buffer.from(secret),
    });

    if (!match) {
      return err(new NotFoundException('Username or password does not match'));
    }

    if (user?.suspended) {
      return err(new UnauthorizedException());
    }

    return ok(user);
  }

  async get(id: string): Promise<Result<AdminUser | null, Error>> {
    return fromPromiseResult(this.repository.findOneBy({ id: Equal(id) }));
  }

  async updateInfo(
    userId: string,
    data: UpdateAdminInfoRequest,
  ): Promise<Result<AdminUser, Error>> {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      return err(new BadRequestException('Secret not found'));
    }
    const userResult = await fromPromiseResult(
      this.repository.findOneByOrFail({
        id: userId,
      }),
    );

    if (userResult.isErr()) {
      return err(userResult.error);
    }
    const user = userResult.value;

    if (data.password) {
      const password = await argon2.hash(data.password, {
        secret: Buffer.from(secret),
      });
      user.password = password;
    }
    user.name = data.name ?? user.name;
    return fromPromiseResult(this.repository.save(user));
  }

  async updateAdmin(
    data: Pick<AdminUser, 'name' | 'password' | 'username' | 'roles'>,
  ) {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new BadRequestException('Secret not found');
    }
    const password = await argon2.hash(data.password, {
      secret: Buffer.from(secret),
    });
    const user = await this.repository.findOneBy({
      username: data.username,
    });
    if (!user) {
      return;
    }
    await this.repository.update(
      {
        id: user.id,
      },
      {
        name: data.name ?? user.name,
        password,
        roles: data.roles ?? user.roles,
      },
    );
  }

  async createAdmin(
    data: Pick<AdminUser, 'name' | 'password' | 'username' | 'roles'>,
  ) {
    const secret = this.configService.get('NEST_PASSWORD_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new BadRequestException('Secret not found');
    }
    const check = await this.repository.findOneBy({
      username: data.username,
    });
    if (check) {
      throw new Error('Admin already exits.');
    }
    const password = await argon2.hash(data.password, {
      secret: Buffer.from(secret),
    });
    return this.repository.save(
      this.repository.create({
        username: data.username,
        password,
        name: data.name,
        roles: data.roles,
      }),
    );
  }
}
