import { Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { AdminWalletWithdrawService } from '../services/admin.wallet-withdraw.service';
import { WalletWithdraw } from '../wallet-withdraw.entity';
import { NoticeResponse } from '@/common/dto/base.dto';

@Crud({
  model: {
    type: WalletWithdraw,
  },
  query: {
    exclude: ['privateKey'],
  },
  routes: {
    only: ['getOneBase', 'getManyBase', 'updateOneBase', 'deleteOneBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/wallet-withdraw')
@AdminCrud()
export class AdminWalletWithdrawController
  implements CrudController<WalletWithdraw>
{
  constructor(public service: AdminWalletWithdrawService) {}

  @Patch('actions/sync-balance')
  @HttpCode(HttpStatus.OK)
  async syncPoolBalance(): Promise<NoticeResponse> {
    await this.service.syncAllBalances();
    return { success: true };
  }
}
