import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { Controller, Get } from '@nestjs/common';
import { UsersService } from '../user.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { User } from '../user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UsersService) {}
  @Get('me')
  @Authenticated()
  @ApiOkResponse({
    type: User,
  })
  getMe(@AuthUser('userId') id: number) {
    return this.userService.findById(id);
  }
}
