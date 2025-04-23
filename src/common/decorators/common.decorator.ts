import type { AuthUserPayload } from '@/auth/auth.dto';
import { AdminGuard } from '@/auth/auth.guard';
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
  (field: keyof AuthUserPayload, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const user = req.admin;
    if (!user) return undefined;
    return field ? user[field] : user;
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

export const Authenticated = () => {
  return applyDecorators(UseGuards(AdminGuard));
};
