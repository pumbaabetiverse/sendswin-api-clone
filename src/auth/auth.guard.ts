import { AppRequest } from '@/common/types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthSignService } from './auth-sign.service';
import { AuthService } from './auth.service';

@Injectable()
export class TeleAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly authSignService: AuthSignService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const authorization = request.headers?.authorization;

    if (!authorization) {
      throw new UnauthorizedException();
    }
    if (authorization?.startsWith('Bearer')) {
      const [, token] = authorization.split(' ') ?? [];
      const result = await this.authSignService.getUserFromToken(token);
      if (result.isErr()) {
        throw new UnauthorizedException();
      }
      request.auth = result.value;
    } else {
      const teleUserResult = this.authService.parseTeleUser(authorization);
      if (teleUserResult.isErr()) {
        throw new UnauthorizedException();
      }
      const userResult = await this.authService.loginWithTele(
        teleUserResult.value,
      );
      if (userResult.isErr()) {
        throw new UnauthorizedException();
      }
      request.teleUser = teleUserResult.value;
      request.auth = { userId: userResult.value.id };
    }

    return true;
  }
}
