import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { BinanceAccount } from '../binance.entity';
import { AdminBinanceAccountService } from '../services/admin.binance-account.service';
import { NoticeResponse } from '@/common/dto/base.dto';
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
    only: [
      'createOneBase',
      'getOneBase',
      'getManyBase',
      'updateOneBase',
      'deleteOneBase',
    ],
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
  constructor(public service: AdminBinanceAccountService) {}

  @Patch('actions/sync-balance')
  @HttpCode(HttpStatus.OK)
  async syncPoolBalance(): Promise<NoticeResponse> {
    await this.service.syncAllBalances();
    return { success: true };
  }

  @Post('action/withdraw')
  async manualWithdraw(
    @Body() request: ManualWithdrawRequest,
  ): Promise<NoticeResponse> {
    await this.service.withdrawToWallet(
      request.accountId,
      request.symbol,
      request.network,
      request.amount,
      request.walletAddress,
    );

    return {
      success: true,
    };
  }
}
