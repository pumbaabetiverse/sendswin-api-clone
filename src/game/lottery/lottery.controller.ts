import { Controller, Get, Query } from '@nestjs/common';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { LotteryService } from '@/game/lottery/lottery.service';
import { LotteryRoundWallet } from '@/game/lottery/dto/lottery.dto';

@Controller('game/lottery')
export class LotteryController {
  constructor(private readonly lotteryService: LotteryService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(
    @AuthUser('userId') userId: number,
  ): Promise<LotteryRoundWallet> {
    return this.lotteryService.getRoundWallet(userId);
  }

  @Get('history')
  @Authenticated()
  @ApiOkResponsePagination(DepositWithTransactionHashDto)
  getHistory(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return this.lotteryService.getHistory(userId, pagination);
  }
}
