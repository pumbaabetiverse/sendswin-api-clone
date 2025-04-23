import { AdminCrud } from '@/common/decorators/common.decorator';
import { Crud, CrudController } from '@dataui/crud';
import { Controller } from '@nestjs/common';
import { Setting } from '../setting.entity';
import { AdminSettingService } from './admin.setting.service';

@Crud({
  model: {
    type: Setting,
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
    key: {
      field: 'key',
      type: 'string',
      primary: true,
    },
  },
  validation: {
    transform: true,
  },
})
@Controller('admin/setting')
@AdminCrud()
export class AdminSettingController implements CrudController<Setting> {
  constructor(public service: AdminSettingService) {}
}
