import type { AdminUserPayload, AuthUserPayload } from '@/auth/auth.dto';
import { AdminGuard, TeleAuthGuard } from '@/auth/auth.guard';
import type { AppRequest } from '@/common/types';
import type { AuthOptions } from '@dataui/crud';
import { CrudAuth } from '@dataui/crud';
import type { ExecutionContext } from '@nestjs/common';
import {
  applyDecorators,
  createParamDecorator,
  UseGuards,
} from '@nestjs/common';

export const AdminAuth = createParamDecorator(
  (field: keyof AdminUserPayload, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const user = req.admin;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);

export const AuthUser = createParamDecorator(
  (field: keyof AuthUserPayload, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const auth = req.auth;
    if (!auth) return undefined;
    return field ? auth[field] : auth;
  },
);

export const AdminCrud = (options?: AuthOptions) => {
  return applyDecorators(
    UseGuards(AdminGuard),
    CrudAuth({
      classTransformOptions: () => {
        return {
          groups: ['admin'],
        };
      },
      ...options,
    }),
  );
};

export const AdminAuthenticated = () => {
  return applyDecorators(UseGuards(AdminGuard));
};

export const Authenticated = (type?: 'web' | 'tele' | 'admin') => {
  if (type === 'admin') return AdminAuthenticated();
  return applyDecorators(UseGuards(TeleAuthGuard));
};
