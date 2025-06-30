import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { OddEvenRoundWallet } from '@/game/odd-even/dto/odd-even.dto';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';

@Controller('game/odd-even')
export class OddEvenController {
  constructor(private readonly overUnderService: OddEvenService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(
    @AuthUser('userId') userId: number,
  ): Promise<OddEvenRoundWallet> {
    return this.overUnderService.getRoundWallet(userId);
  }

  @Get('history')
  @Authenticated()
  @ApiOkResponsePagination(DepositWithTransactionHashDto)
  getHistory(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return this.overUnderService.getHistory(userId, pagination);
  }
}
