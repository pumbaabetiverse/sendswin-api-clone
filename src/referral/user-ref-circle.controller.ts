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
  UserRefCircleEntityExt,
  WithdrawUserRefCircleRequest,
} from '@/referral/user-ref-circle.dto';
import {
  buildPaginateResponse,
  PaginationQuery,
  PaginationResponse,
} from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
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
  @ApiOkResponsePagination(UserRefCircleEntityExt)
  async getRefCircleInfo(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ): Promise<PaginationResponse<UserRefCircleEntityExt>> {
    const res = await this.userRefCircleService.userRefCirclePagination(
      {
        userId,
      },
      pagination,
      {
        circleId: 'DESC',
      },
    );
    if (res.isErr()) {
      return buildPaginateResponse([], 0, 0);
    } else {
      return res.value;
    }
  }

  @Get('aggregate')
  @Authenticated()
  @ApiOkResponse({
    type: GetAggregateUserRefResponse,
  })
  async getAggregateUserRef(
    @AuthUser('userId') userId: number,
  ): Promise<GetAggregateUserRefResponse> {
    const res = await this.userRefCircleService.getAggregateUserRef(userId);
    if (res.isErr()) {
      return {
        childCount: 0,
        totalEarned: 0,
      };
    }
    return res.value;
  }

  @Get(':circleId/children')
  @Authenticated()
  @ApiOkResponsePagination(UserRefCircleEntityExt)
  async getChildrenOfRefCircleInfo(
    @AuthUser('userId') userId: number,
    @Param('circleId') circleId: number,
    @Query() pagination: PaginationQuery,
  ): Promise<PaginationResponse<UserRefCircleEntityExt>> {
    const res = await this.userRefCircleService.userRefCirclePagination(
      {
        parentId: userId,
        circleId,
      },
      pagination,
      {
        contributeToParent: 'DESC',
      },
    );
    if (res.isErr()) {
      return buildPaginateResponse([], 0, 0);
    } else {
      return res.value;
    }
  }
}
