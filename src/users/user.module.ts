// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/user.entity';
import { UsersService } from '@/users/user.service';
import { AdminUserController } from './controllers/admin.user.controller';
import { AdminUserService } from './services/admin.user.service';

@Module({
  controllers: [AdminUserController],
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, AdminUserService],
  exports: [UsersService],
})
export class UsersModule {}
