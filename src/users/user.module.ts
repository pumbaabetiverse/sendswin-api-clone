import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/user.entity';
import { UsersService } from '@/users/user.service';
import { UserController } from './controllers/user.controller';
import { CacheModule } from '@/cache/cache.module';
import { TelegramModule } from '@/telegram/telegram.module';

@Global()
@Module({
  controllers: [UserController],
  imports: [TypeOrmModule.forFeature([User]), CacheModule, TelegramModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
