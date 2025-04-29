import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { PaginationQuery } from '@/common/dto/pagination.dto';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { Deposit } from '@/deposits/deposit.entity';
import { Controller, Get, Query } from '@nestjs/common';
import { OddEvenService } from '@/game/odd-even/odd-even.service';
import { OddEvenRoundWallet } from '@/game/odd-even/dto/odd-even.dto';

@Controller('game/odd-even')
export class OddEvenController {
  constructor(private readonly overUnderService: OddEvenService) {}

  @Get('wallet')
  @Authenticated()
  getRoundWallet(): Promise<OddEvenRoundWallet> {
    return this.overUnderService.getRoundWallet();
  }

  @Get('history')
  @Authenticated()
  @ApiOkResponsePagination(Deposit)
  getHistory(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return this.overUnderService.getHistory(userId, pagination);
  }
}
