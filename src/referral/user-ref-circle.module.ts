import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRefCircleEntity } from '@/referral/user-ref-circle.entity';
import { UserRefCircleService } from '@/referral/user-ref-circle.service';
import { UsersModule } from '@/users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserRefCircleEntity]), UsersModule],
  providers: [UserRefCircleService],
  exports: [UserRefCircleService],
})
export class UserRefCircleModule {}
