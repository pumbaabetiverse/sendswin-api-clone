import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import {
  GetRefCircleResponse,
  WithdrawUserRefCircleRequest,
  WithdrawUserRefCircleResponse,
} from '@/referral/user-ref-circle.dto';

@Controller('user-ref-circle')
export class UserRefCircleController {
  private readonly logger = new Logger(UserRefCircleController.name);

  constructor(private readonly userRefCircleService: UserRefCircleService) {}

  @Post('withdraw')
  @Authenticated()
  async withdraw(
    @AuthUser('userId') userId: number,
    @Body() request: WithdrawUserRefCircleRequest,
  ): Promise<WithdrawUserRefCircleResponse> {
    try {
      await this.userRefCircleService.withdrawCircle(userId, request.circleId);
      return {
        success: true,
        message: '',
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(err.message, err.stack);
        return {
          success: false,
          message: err.message,
        };
      }
    }
    return {
      success: false,
      message: 'Unknown error',
    };
  }

  @Get('')
  @Authenticated()
  async getRefCircleInfo(
    @AuthUser('userId') userId: number,
    @Query('circleIds') circleIds: number[],
  ): Promise<GetRefCircleResponse> {
    try {
      return await this.userRefCircleService.getUserRefCircleAndChildren(
        userId,
        circleIds,
      );
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(err.message, err.stack);
      }
      return {
        childRefCircles: [],
        userRefCircles: [],
      };
    }
  }
}
