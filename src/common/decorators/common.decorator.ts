import type { AuthUserPayload } from '@/auth/auth.dto';
import { TeleAuthGuard } from '@/auth/auth.guard';
import type { AppRequest } from '@/common/types';
import type { ExecutionContext } from '@nestjs/common';
import {
  applyDecorators,
  createParamDecorator,
  UseGuards,
} from '@nestjs/common';

export const AuthUser = createParamDecorator(
  (field: keyof AuthUserPayload, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const auth = req.auth;
    if (!auth) return undefined;
    return field ? auth[field] : auth;
  },
);

export const Authenticated = () => {
  return applyDecorators(UseGuards(TeleAuthGuard));
};
