import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NewDepositDto } from '@/deposits/deposit.dto';
import { DepositsService } from '@/deposits/deposit.service';
import { ActionResponse } from '@/common/dto/base.dto';
import { BinanceAccount } from '@/binance/binance.entity';

@Controller('deposits')
export class DepositController {
  constructor(private readonly depositService: DepositsService) {}

  @Post('')
  async addDeposit(@Body() body: NewDepositDto): Promise<ActionResponse> {
    await this.depositService.addFakeNewDeposit(body);
    return {
      success: true,
      message: '',
    };
  }

  @Get('/binance-account/recents')
  async getBinanceAccounts(
    @Query('userId') userId: number,
  ): Promise<BinanceAccount[]> {
    return await this.depositService.getRecentBinanceAccountUsedByUserId(
      userId,
    );
  }
}
