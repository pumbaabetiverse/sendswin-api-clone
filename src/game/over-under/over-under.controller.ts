import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { OverUnderRoundWallet } from './dto/over-under.dto';
import { OverUnderService } from './over-under.service';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';

@Controller('game/over-under')
export class OverUnderController {
  constructor(private readonly overUnderService: OverUnderService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(): Promise<OverUnderRoundWallet> {
    return this.overUnderService.getRoundWallet();
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
