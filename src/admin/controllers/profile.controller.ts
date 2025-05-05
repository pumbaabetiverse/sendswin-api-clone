import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';

import { AdminAuth, Authenticated } from '@/common/decorators/common.decorator';
import { ApiOkResponse } from '@nestjs/swagger';
import { UpdateAdminInfoRequest } from '../dto/admin-user.dto';
import { AdminUser } from '../entities/admin-user.entity';
import { AdminUserService } from '../services/admin-user.service';

@Controller('admin/profile')
@Authenticated('admin')
export class AdminProfileController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AdminUser,
  })
  async getMe(@AdminAuth('userId') userId: string): Promise<AdminUser | null> {
    const result = await this.adminUserService.get(userId);
    if (result.isOk()) {
      return result.value;
    }
    throw new BadRequestException(result.error.message);
  }

  @Patch('update')
  @HttpCode(HttpStatus.OK)
  async changeProfile(
    @AdminAuth('userId') userId: string,
    @Body() data: UpdateAdminInfoRequest,
  ): Promise<AdminUser> {
    const result = await this.adminUserService.updateInfo(userId, data);
    if (result.isOk()) {
      return result.value;
    }
    throw new BadRequestException(result.error.message);
  }
}
