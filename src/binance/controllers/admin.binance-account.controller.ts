import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { BinanceAccount } from '../binance.entity';
import { AdminBinanceAccountService } from '../services/admin.binance-account.service';
import { ActionResponse, NoticeResponse } from '@/common/dto/base.dto';
import { BlockchainNetwork, BlockchainToken } from '@/common/const';
import { ApiProperty } from '@nestjs/swagger';

export class ManualWithdrawRequest {
  @ApiProperty()
  accountId: number;

  @ApiProperty({
    enum: BlockchainToken,
  })
  symbol: BlockchainToken;

  @ApiProperty({
    enum: BlockchainNetwork,
  })
  network: BlockchainNetwork;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  walletAddress: string;
}

@Crud({
  model: {
    type: BinanceAccount,
  },
  query: {
    exclude: ['binanceApiKey', 'binanceApiSecret'],
  },
  routes: {
    only: ['createOneBase', 'getOneBase', 'getManyBase', 'updateOneBase'],
  },
  params: {
    id: {
      type: 'number',
      primary: true,
      field: 'id',
    },
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/binance-account')
@AdminCrud()
export class AdminBinanceAccountController
  implements CrudController<BinanceAccount>
{
  private readonly logger = new Logger(AdminBinanceAccountController.name);

  constructor(public service: AdminBinanceAccountService) {}

  @Patch('actions/sync-balance')
  @HttpCode(HttpStatus.OK)
  async syncPoolBalance(): Promise<NoticeResponse> {
    await this.service.syncAllBalances();
    return { success: true };
  }

  @Post('actions/withdraw')
  @HttpCode(HttpStatus.OK)
  async manualWithdraw(
    @Body() request: ManualWithdrawRequest,
  ): Promise<ActionResponse> {
    const result = await this.service.withdrawToWallet(
      request.accountId,
      request.symbol,
      request.network,
      request.amount,
      request.walletAddress,
    );

    if (result.isOk()) {
      return {
        success: true,
        message: '',
      };
    } else {
      this.logger.error(result.error.message, result.error.stack);
      return {
        success: false,
        message: result.error.message,
      };
    }
  }
}
