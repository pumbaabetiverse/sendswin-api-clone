import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAdminUserController } from './controllers/admin.admin-user.controller';
import { AdminProfileController } from './controllers/profile.controller';
import { AdminUser } from './entities/admin-user.entity';
import { AdminUserService } from './services/admin-user.service';
import { AdminAdminUserService } from './services/admin.admin-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser])],
  controllers: [AdminAdminUserController, AdminProfileController],
  providers: [AdminUserService, AdminAdminUserService],
  exports: [AdminUserService],
})
export class AdminModule {}
