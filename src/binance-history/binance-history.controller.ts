import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceHistoryService } from '@/binance-history/binance-history.service';

@Controller('binance-history')
export class BinanceHistoryController {
  constructor(private readonly binanceHistoryService: BinanceHistoryService) {}

  @Get(':userId')
  async getBinanceHistory(
    @Param('userId') userId: number,
    @Query('isSendOnly') isSendOnly: number,
  ) {
    return await this.binanceHistoryService.getHistories(
      userId,
      isSendOnly == 1,
    );
  }
}
