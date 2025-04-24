import { Controller } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { AdminWalletWithdrawService } from '../services/admin.wallet-withdraw.service';
import { WalletWithdraw } from '../wallet-withdraw.entity';

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
}
