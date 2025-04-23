import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AdminUserPayload, AuthUserPayload } from './auth.dto';

@Injectable()
export class AuthSignService {
  constructor(private readonly jwtService: JwtService) {}

  async getAdminFromToken(token: string): Promise<AdminUserPayload> {
    return this.jwtService.verifyAsync<AdminUserPayload>(token, {
      audience: 'admin',
    });
  }

  genAdminToken(userId: string) {
    const user: AdminUserPayload = { userId };
    return this.jwtService.signAsync(user, {
      audience: 'admin',
      expiresIn: '7d',
    });
  }

  async getUserFromToken(token: string): Promise<AuthUserPayload> {
    return this.jwtService.verifyAsync<AuthUserPayload>(token, {
      audience: 'user',
    });
  }

  genUserToken(userId: number) {
    const user: AuthUserPayload = { userId };
    return this.jwtService.signAsync(user, {
      audience: 'user',
    });
  }
}
