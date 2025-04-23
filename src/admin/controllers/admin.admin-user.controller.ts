import { Controller } from '@nestjs/common';

import { AdminCrud } from '@/common/decorators/common.decorator';
import {
  Crud,
  CrudController,
  CrudRequest,
  Override,
  ParsedBody,
  ParsedRequest,
} from '@dataui/crud';
import {
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../dto/admin-user.dto';
import { AdminUser } from '../entities/admin-user.entity';
import { AdminAdminUserService } from '../services/admin.admin-user.service';

@Crud({
  model: {
    type: AdminUser,
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
  dto: {
    create: CreateAdminUserRequest,
    update: UpdateAdminUserRequest,
  },
  validation: {
    transform: true,
    whitelist: true,
    transformOptions: {
      enableImplicitConversion: true,
      ignoreDecorators: true,
    },
  },
})
@Controller('admin/admin-user')
@AdminCrud()
export class AdminAdminUserController implements CrudController<AdminUser> {
  constructor(public service: AdminAdminUserService) {}

  get base(): CrudController<AdminUser> {
    return this;
  }

  @Override('createOneBase')
  createOne(
    @ParsedRequest() req: CrudRequest,
    @ParsedBody() dto: CreateAdminUserRequest,
  ) {
    return this.service.createOneAdmin(req, dto);
  }

  @Override('updateOneBase')
  updateOne(
    @ParsedRequest() req: CrudRequest,
    @ParsedBody() dto: UpdateAdminUserRequest,
  ) {
    return this.service.updateOneAdmin(req, dto);
  }
}
