import { Body, Controller, Post } from '@nestjs/common';
import { NewDepositDto } from '@/deposits/deposit.dto';
import { DepositsService } from '@/deposits/deposit.service';
import { ActionResponse } from '@/common/dto/base.dto';

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
}
