import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramModule } from '@/telegram/telegram.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { UsersModule } from '@/users/user.module';
import { session } from 'telegraf';
import { DepositsModule } from '@/deposits/deposit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WithdrawModule } from '@/withdraw/withdraw.module';
import { BullModule } from '@nestjs/bullmq';
import { BinanceModule } from '@/binance/binance.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { EnvironmentVariables } from './common/types';
import { HealthModule } from './health/health.module';
import { GameModule } from './game/game.module';
import { UserRefCircleModule } from '@/referral/user-ref-circle.module';
import { NotificationModule } from '@/notification/notification.module';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BinanceHistoryModule } from '@/binance-history/binance-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const isTls = configService.get<string>('REDIS_TLS');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }
        return {
          type: 'single',
          url: redisUrl,
          options: {
            tls: isTls == '1' ? {} : undefined,
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres', { infer: true }),
        password: configService.get('DB_PASSWORD', 'password', { infer: true }),
        database: configService.get('DB_DATABASE', 'postgres'),
        synchronize: configService.get('DB_SYNCHRONIZE', { infer: true }),
        logging: configService.get('DB_LOGGING', false, { infer: true }),
        schema: configService.get('DB_SCHEMA', 'public'),
        autoLoadEntities: true,
        poolSize: 15,
      }),
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        const dataSource = await new DataSource(options).initialize();
        return addTransactionalDataSource(dataSource);
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const isTls = configService.get<string>('REDIS_TLS');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }
        return {
          connection: {
            url: redisUrl,
            tls: isTls == '1' ? {} : undefined,
          },
        };
      },
    }),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const token = configService.get('TELEGRAM_BOT_TOKEN', {
          infer: true,
        });
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not defined');
        }
        const publicDomain = configService.get('NEST_PUBLIC_DOMAIN', {
          infer: true,
        });
        return {
          token,
          middlewares: [session()],
          launchOptions: publicDomain
            ? {
                webhook: {
                  domain: publicDomain,
                  path: '/tele-webhook',
                  secretToken: configService.get('TELEGRAM_BOT_SECRET_TOKEN'),
                },
              }
            : undefined,
        };
      },
    }),
    HealthModule,
    TelegramModule,
    UsersModule,
    DepositsModule,
    WithdrawModule,
    BinanceModule,
    AuthModule,
    GameModule,
    UserRefCircleModule,
    NotificationModule,
    BinanceHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
