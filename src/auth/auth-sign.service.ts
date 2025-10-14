import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthUserPayload } from './auth.dto';
import { Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class AuthSignService {
  constructor(private readonly jwtService: JwtService) {}

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
        expiresIn: '7d',
      }),
    );
  }
}
