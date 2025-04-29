import { Body, Controller, Logger, Post } from '@nestjs/common';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import {
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
}
