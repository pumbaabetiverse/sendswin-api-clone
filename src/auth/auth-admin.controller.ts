import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { AdminLoginPayloadDto, LoginResponseDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('admin/auth')
export class AuthAdminController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login to admin',
  })
  async login(@Body() body: AdminLoginPayloadDto): Promise<LoginResponseDto> {
    const accessToken = await this.authService.loginAdmin(body);
    return { accessToken };
  }
}
