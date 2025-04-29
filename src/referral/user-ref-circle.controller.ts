import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import {
  WithdrawUserRefCircleRequest,
  WithdrawUserRefCircleResponse,
} from '@/referral/user-ref-circle.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';

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
  @ApiOkResponsePagination(UserRefCircleEntity)
  async getRefCircleInfo(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return await this.userRefCircleService.userRefCirclePagination(
      {
        userId,
      },
      pagination,
      {
        circleId: 'DESC',
      },
    );
  }

  @Get(':circleId/children')
  @Authenticated()
  @ApiOkResponsePagination(UserRefCircleEntity)
  async getChildrenOfRefCircleInfo(
    @AuthUser('userId') userId: number,
    @Param('circleId') circleId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return await this.userRefCircleService.userRefCirclePagination(
      {
        parentId: userId,
        circleId,
      },
      pagination,
      {
        contributeToParent: 'DESC',
      },
    );
  }
}
