import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminUserService } from '@/admin/services/admin-user.service';
import { AdminLoginPayloadDto } from './auth.dto';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/common/types';
import { isValid, parse, User } from '@telegram-apps/init-data-node';
import { UsersService } from '@/users/user.service';
import { err, ok, Result } from 'neverthrow';
import { AuthSignService } from '@/auth/auth-sign.service';
import { User as UserEntity } from '@/users/user.entity';
import { fromSyncResult } from '@/common/errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly authSignService: AuthSignService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async loginAdmin(
    options: AdminLoginPayloadDto,
  ): Promise<Result<string, Error>> {
    const userResult = await this.adminUserService.verify(options);
    if (userResult.isErr()) {
      return err(userResult.error);
    }
    return this.authSignService.genAdminToken(userResult.value.id);
  }

  parseTeleUser(teleInitData: string): Result<
    {
      added_to_attachment_menu?: boolean | undefined;
      allows_write_to_pm?: boolean | undefined;
      first_name: string;
      id: number;
      is_bot?: boolean | undefined;
      is_premium?: boolean | undefined;
      last_name?: string | undefined;
      language_code?: string | undefined;
      photo_url?: string | undefined;
      username?: string | undefined;
    },
    Error
  > {
    const initDataString = atob(teleInitData);
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN', {
      infer: true,
    });
    if (!botToken) {
      return err(new UnauthorizedException('TELEGRAM_BOT_TOKEN is not set'));
    }
    if (!isValid(initDataString, botToken)) {
      return err(new UnauthorizedException());
    }
    const parseResult = fromSyncResult(() => parse(initDataString));

    if (parseResult.isErr()) {
      return err(new UnauthorizedException());
    }

    const initData = parseResult.value;
    if (!initData.user) {
      return err(new UnauthorizedException());
    }
    return ok(initData.user);
  }

  async loginWithTele(data: User): Promise<Result<UserEntity, Error>> {
    return this.userService.createOrUpdateUser(
      `${data.id}`,
      `${data.first_name} ${data.last_name}`,
    );
  }

  async getUserByTele(data: User): Promise<Result<UserEntity | null, Error>> {
    return this.userService.findByTelegramId(`${data.id}`);
  }
}
