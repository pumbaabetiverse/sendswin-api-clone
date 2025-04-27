import { Controller } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { AdminUserService } from '../services/admin.user.service';
import { User } from '../user.entity';

@Crud({
  model: {
    type: User,
  },
  routes: {
    only: ['getOneBase', 'getManyBase', 'updateOneBase'],
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/user')
@AdminCrud()
export class AdminUserController implements CrudController<User> {
  constructor(public service: AdminUserService) {}
}
