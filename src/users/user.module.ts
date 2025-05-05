import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/user.entity';
import { UsersService } from '@/users/user.service';
import { AdminUserController } from './controllers/admin.user.controller';
import { AdminUserService } from './services/admin.user.service';
import { UserController } from './controllers/user.controller';
import { CacheModule } from '@/cache/cache.module';

@Global()
@Module({
  controllers: [AdminUserController, UserController],
  imports: [TypeOrmModule.forFeature([User]), CacheModule],
  providers: [UsersService, AdminUserService],
  exports: [UsersService],
})
export class UsersModule {}
