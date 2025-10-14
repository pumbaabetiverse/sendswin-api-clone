import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { GameService } from '@/game/game.service';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Authenticated, AuthUser } from '@/common/decorators/common.decorator';
import { ApiOkResponsePagination } from '@/common/dto/response.dto';
import { DepositWithTransactionHashDto } from '@/deposits/deposit.dto';
import { PaginationQuery } from '@/common/dto/pagination.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @CacheKey('game_wallet')
  @CacheTTL(1000 * 60 * 5)
  @UseInterceptors(CacheInterceptor)
  @Get('wallet')
  async getWallet() {
    return this.gameService.getWallet();
    // return {
    //   wallet: await this.gameService.getWallet(),
    //   time: new Date().getTime(),
    // };
  }

  @Get('history')
  @Authenticated()
  @ApiOkResponsePagination(DepositWithTransactionHashDto)
  getHistory(
    @AuthUser('userId') userId: number,
    @Query() pagination: PaginationQuery,
  ) {
    return this.gameService.getHistory(userId, pagination);
  }
}
