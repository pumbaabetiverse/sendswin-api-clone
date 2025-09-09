import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { UsersService } from '../user.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { User } from '../user.entity';
import {
  UpdateUserBinanceUsernameRequest,
  UpdateUserWalletAddressRequest,
} from '@/users/user.dto';
import { ActionResponse } from '@/common/dto/base.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  @Authenticated()
  @ApiOkResponse({
    type: User,
  })
  async getMe(@AuthUser('userId') userId: number): Promise<User | null> {
    return (await this.userService.findById(userId)).unwrapOr(null);
  }

  @Get('all')
  async getAll(): Promise<User[]> {
    return (await this.userService.findAll()).unwrapOr([]);
  }

  @Post('me/wallet')
  @Authenticated()
  @ApiOkResponse({
    type: ActionResponse,
  })
  async updateWallet(
    @AuthUser('userId') userId: number,
    @Body() request: UpdateUserWalletAddressRequest,
  ): Promise<ActionResponse> {
    const res = await this.userService.updateWalletAddress(
      userId,
      request.walletAddress,
    );
    if (res.isOk()) {
      return {
        success: true,
        message: '',
      };
    } else {
      return {
        success: false,
        message: res.error.message,
      };
    }
  }

  @Post('me/binance')
  @Authenticated()
  @ApiOkResponse({
    type: ActionResponse,
  })
  async updateBinanceUsername(
    @AuthUser('userId') userId: number,
    @Body() request: UpdateUserBinanceUsernameRequest,
  ): Promise<ActionResponse> {
    const res = await this.userService.updateBinanceUsername(
      userId,
      request.binanceUsername,
    );
    if (res.isOk()) {
      return {
        success: true,
        message: '',
      };
    } else {
      return {
        success: false,
        message: res.error.message,
      };
    }
  }

  @Get('/:id')
  async getUser(@Param('id') userId: number): Promise<User> {
    const res = (await this.userService.findById(userId)).unwrapOr(null);
    if (!res) {
      throw new NotFoundException('user not found');
    }
    return res;
  }
}
