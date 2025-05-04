import { Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { NoticeResponse } from '@/common/dto/base.dto';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { AdminWalletWithdrawService } from '@/withdraw/services/admin.wallet-withdraw.service';

@Crud({
  model: {
    type: WalletWithdraw,
  },
  query: {
    exclude: ['privateKey'],
  },
  routes: {
    only: ['createOneBase', 'getOneBase', 'getManyBase', 'updateOneBase'],
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
