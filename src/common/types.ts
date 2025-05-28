import { AdminUserPayload, AuthUserPayload } from '@/auth/auth.dto';
import { InitData } from '@telegram-apps/init-data-node';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface EnvironmentVariables {
  PORT: string;

  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNCHRONIZE: 'true' | 'false';
  DB_LOGGING: 'true' | 'false';

  REDIS_URL: string;
  JWT_SECRET: string;

  NEST_PASSWORD_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_SECRET_TOKEN: string;
  TELEGRAM_ADMIN_BOT_TOKEN: string;

  NEST_ENABLE_OPENAPI_DOC: 'true' | 'false';

  NEST_PUBLIC_DOMAIN: string;

  // R2 Object Storage
  R2_ENDPOINT_URL: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
}

export type RawRequest = FastifyRequest['raw'] &
  Pick<
    AppRequest,
    'originalUrl' | 'hostname' | 'host' | 'query' | 'body' | 'clientIp'
  >;

export type AppRequest = Omit<FastifyRequest, 'body'> & {
  admin?: AdminUserPayload;
  query: Record<string, string>;
  body: Record<string, any>;
  clientIp?: string;
  auth?: AuthUserPayload;
  teleInitData?: InitData;
  teleUser?: InitData['user'];
};

export type AppResponse = FastifyReply;
export type RawResponse = FastifyReply['raw'];
