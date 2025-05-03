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
  GetAggregateUserRefResponse,
  WithdrawUserRefCircleRequest,
} from '@/referral/user-ref-circle.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { ApiOkResponse } from '@nestjs/swagger';
import { ActionResponse } from '@/common/dto/base.dto';
import { CacheService } from '@/cache/cache.service';

@Controller('user-ref-circle')
export class UserRefCircleController {
  private readonly logger = new Logger(UserRefCircleController.name);

  constructor(
    private readonly userRefCircleService: UserRefCircleService,
    private readonly cacheService: CacheService,
  ) {}

  @Post('withdraw')
  @Authenticated()
  async withdraw(
    @AuthUser('userId') userId: number,
    @Body() request: WithdrawUserRefCircleRequest,
  ): Promise<ActionResponse> {
    const result = await this.cacheService.executeWithLock(
      `lock:withdraw-ref:${userId}`,
      5000,
      async () =>
        this.userRefCircleService.withdrawCircle(userId, request.circleId),
    );
    if (result.isErr()) {
      return {
        success: false,
        message: result.error.message,
      };
    }
    return {
      success: true,
      message: '',
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

  @Get('aggregate')
  @Authenticated()
  @ApiOkResponse({
    type: GetAggregateUserRefResponse,
  })
  async getAggregateUserRef(
    @AuthUser('userId') userId: number,
  ): Promise<GetAggregateUserRefResponse> {
    return await this.userRefCircleService.getAggregateUserRef(userId);
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
