import {
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
@Authenticated()
export class AdminProfileController {
  constructor(private readonly adminUserService: AdminUserService) {}
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AdminUser,
  })
  async getMe(@AdminAuth('userId') userId: string) {
    return this.adminUserService.get(userId);
  }

  @Patch('update')
  @HttpCode(HttpStatus.OK)
  async changeProfile(
    @AdminAuth('userId') userId: string,
    @Body() data: UpdateAdminInfoRequest,
  ) {
    return this.adminUserService.updateInfo(userId, data);
  }
}
