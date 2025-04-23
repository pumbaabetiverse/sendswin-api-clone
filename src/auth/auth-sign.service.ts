import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthUserPayload } from './auth.dto';

@Injectable()
export class AuthSignService {
  constructor(private readonly jwtService: JwtService) {}

  async getAdminFromToken(token: string): Promise<AuthUserPayload> {
    return this.jwtService.verifyAsync<AuthUserPayload>(token, {
      audience: 'admin',
    });
  }

  genAdminToken(userId: string) {
    const user: AuthUserPayload = { userId };
    return this.jwtService.signAsync(user, {
      audience: 'admin',
      expiresIn: '7d',
    });
  }
}
