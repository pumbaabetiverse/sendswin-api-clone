import { EnvironmentVariables } from '@/common/types';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthSignService } from './auth-sign.service';
import { TeleAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
  imports: [
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
  controllers: [AuthController],
  providers: [AuthService, TeleAuthGuard, AuthSignService],
  exports: [AuthService, AuthSignService],
})
export class AuthModule {}
