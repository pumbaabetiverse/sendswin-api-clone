import helmet from '@fastify/helmet';
import { ConsoleLogger, RequestMethod, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import qs from 'qs';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './common/types';
import { setupSwagger } from './setupSwagger';
import { TimeoutInterceptor } from './common/middlewares/timeout.interceptor';
import { getBotToken } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    querystringParser: (str) => qs.parse(str),
    logger: false,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      forceCloseConnections: true,
      logger: new ConsoleLogger({
        json: true,
        logLevels: ['debug', 'error', 'warn'],
      }),
      abortOnError: true,
      rawBody: true,
    },
  );
  await app.register(helmet, {
    hidePoweredBy: true,
  });
  app.enableCors({
    origin: (origin, callback) => {
      //
      callback(null, true); // Cho phép;
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
  });
  app.setGlobalPrefix('api', {
    exclude: [
      {
        path: '/',
        version: '1',
        method: RequestMethod.ALL,
      },
    ],
  });

  app.useGlobalInterceptors(new TimeoutInterceptor());

  const configService =
    app.get<ConfigService<EnvironmentVariables>>(ConfigService);
  const publicDomain = configService.get('NEST_PUBLIC_DOMAIN', {
    infer: true,
  });

  if (publicDomain) {
    const bot = app.get<Telegraf>(getBotToken());
    app.use(bot.webhookCallback('/tele-webhook'));
  }

  if (
    configService.get('NEST_ENABLE_OPENAPI_DOC', { infer: true }) === 'true'
  ) {
    setupSwagger(app);
  }
  await app.listen(+configService.get<string>('PORT', '3000'), '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((err) => console.log(err));

process.on('beforeExit', (code) => {
  console.log('Process beforeExit event with code: ', code);
});

process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});

process.on('uncaughtException', (...args) => {
  console.log('Uncaught Exception', args);
});

process.on('unhandledRejection', (...args) => {
  console.log('Unhandled Rejection', args);
});

process.on('rejectionHandled', (...args) => {
  console.log('Rejection Handled', args);
});
