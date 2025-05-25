import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { LuckySevenRoundWallet } from './dto/lucky-seven.dto';
import { LuckySevenService } from './lucky-seven.service';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';

@Controller('game/lucky-seven')
export class LuckySevenController {
  constructor(private readonly luckySevenService: LuckySevenService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(): Promise<LuckySevenRoundWallet> {
    return this.luckySevenService.getRoundWallet();
  }

  @Get('history')
  @Authenticated()
  @ApiOkResponsePagination(DepositWithTransactionHashDto)
  getHistory(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return this.luckySevenService.getHistory(userId, pagination);
  }
}
