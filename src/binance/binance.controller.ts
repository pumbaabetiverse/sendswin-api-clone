import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { BinanceService } from '@/binance/binance.service';
import { BinanceAccount } from '@/binance/binance.entity';

@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}

  @Get(':id')
  async getById(@Param('id') id: number): Promise<BinanceAccount> {
    const account = (
      await this.binanceService.getBinanceAccountById(id)
    ).unwrapOr(null);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}
