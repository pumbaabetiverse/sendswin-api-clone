import { Controller } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { Deposit } from '../deposit.entity';
import { AdminDepositService } from '../services/admin.deposit.service';

@Crud({
  model: {
    type: Deposit,
  },
  routes: {
    only: ['createOneBase', 'getOneBase', 'getManyBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/deposit')
@AdminCrud()
export class AdminDepositController implements CrudController<Deposit> {
  constructor(public service: AdminDepositService) {}
}
