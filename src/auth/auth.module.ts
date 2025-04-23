import { EnvironmentVariables } from '@/common/types';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from '../admin/admin.module';
import { AuthAdminController } from './auth-admin.controller';
import { AuthSignService } from './auth-sign.service';
import { AdminGuard, TeleAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    AdminModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        global: true,
        secret: configService.get('JWT_SECRET', {
          infer: true,
        }),
        signOptions: {
          issuer: 'x365.fun',
          expiresIn: '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthAdminController],
  providers: [AuthService, AdminGuard, TeleAuthGuard, AuthSignService],
  exports: [AuthService, AuthSignService],
})
export class AuthModule {}
