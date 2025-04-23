import { PartialType, PickType } from '@nestjs/swagger';
import { AdminUser } from '../entities/admin-user.entity';

export class CreateAdminUserRequest extends PickType(AdminUser, [
  'name',
  'password',
  'roles',
  'username',
]) {}
export class UpdateAdminUserRequest extends PartialType(
  PickType(AdminUser, ['name', 'password', 'roles', 'username', 'suspended']),
) {}

export class UpdateAdminInfoRequest extends PartialType(
  PickType(AdminUser, ['name', 'password']),
) {}
