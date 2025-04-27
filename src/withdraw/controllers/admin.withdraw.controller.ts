import { Controller } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { AdminWithdrawService } from '../services/admin.withdraw.service';
import { Withdraw } from '../withdraw.entity';

@Crud({
  model: {
    type: Withdraw,
  },
  routes: {
    only: ['getOneBase', 'getManyBase', 'updateOneBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/withdraw')
@AdminCrud()
export class AdminWithdrawController implements CrudController<Withdraw> {
  constructor(public service: AdminWithdrawService) {}
}
