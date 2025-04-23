import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminUserService } from '../admin/services/admin-user.service';
import { AuthSignService } from './auth-sign.service';
import { AdminLoginPayloadDto } from './auth.dto';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/common/types';
import { isValid, parse, User } from '@telegram-apps/init-data-node';
import { UsersService } from '@/users/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly authSignService: AuthSignService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async loginAdmin(options: AdminLoginPayloadDto) {
    const user = await this.adminUserService.verify(options);
    return this.authSignService.genAdminToken(user.id);
  }

  parseTeleUser(teleInitData: string) {
    const initDataString = atob(teleInitData);
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN', {
      infer: true,
    });
    if (!botToken) {
      throw new UnauthorizedException('TELEGRAM_BOT_TOKEN is not set');
    }
    if (!isValid(initDataString, botToken)) {
      throw new UnauthorizedException();
    }
    const initData = parse(initDataString);

    if (!initData.user) {
      throw new UnauthorizedException();
    }
    return initData.user;
  }

  async loginWithTele(data: User) {
    return this.userService.createOrUpdateUser(`${data.id}`, data.first_name);
  }

  async getUserByTele(data: User) {
    return this.userService.findByTelegramId(`${data.id}`);
  }
}
