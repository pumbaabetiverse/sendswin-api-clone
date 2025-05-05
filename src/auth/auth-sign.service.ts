import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AdminUserPayload, AuthUserPayload } from './auth.dto';
import { Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class AuthSignService {
  constructor(private readonly jwtService: JwtService) {}

  async getAdminFromToken(
    token: string,
  ): Promise<Result<AdminUserPayload, Error>> {
    return fromPromiseResult(
      this.jwtService.verifyAsync<AdminUserPayload>(token, {
        audience: 'admin',
      }),
    );
  }

  async genAdminToken(userId: string): Promise<Result<string, Error>> {
    const user: AdminUserPayload = { userId };
    return fromPromiseResult(
      this.jwtService.signAsync(user, {
        audience: 'admin',
        expiresIn: '7d',
      }),
    );
  }

  async getUserFromToken(
    token: string,
  ): Promise<Result<AuthUserPayload, Error>> {
    return fromPromiseResult(
      this.jwtService.verifyAsync<AuthUserPayload>(token, {
        audience: 'user',
      }),
    );
  }

  async genUserToken(userId: number): Promise<Result<string, Error>> {
    const user: AuthUserPayload = { userId };
    return fromPromiseResult(
      this.jwtService.signAsync(user, {
        audience: 'user',
      }),
    );
  }
}
