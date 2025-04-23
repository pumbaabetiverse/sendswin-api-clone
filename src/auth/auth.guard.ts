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
export class AdminGuard implements CanActivate {
  constructor(private readonly authSignService: AuthSignService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.authSignService.getAdminFromToken(token);
      request.admin = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: AppRequest): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

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
      try {
        const [, token] = authorization.split(' ') ?? [];
        const auth = await this.authSignService.getUserFromToken(token);
        request.auth = auth;
      } catch {
        throw new UnauthorizedException();
      }
    } else {
      try {
        const teleUser = this.authService.parseTeleUser(authorization);
        const user = await this.authService.loginWithTele(teleUser);

        request.teleUser = teleUser;
        request.auth = { userId: user.id };
      } catch {
        throw new UnauthorizedException();
      }
    }

    return true;
  }
}
