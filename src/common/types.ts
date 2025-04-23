import { AuthUserPayload } from '@/auth/auth.dto';
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

  NEST_ENABLE_OPENAPI_DOC: 'true' | 'false';
}

export type RawRequest = FastifyRequest['raw'] &
  Pick<
    AppRequest,
    'originalUrl' | 'hostname' | 'host' | 'query' | 'body' | 'clientIp'
  >;

export type AppRequest = Omit<FastifyRequest, 'body'> & {
  admin?: AuthUserPayload;
  query: Record<string, string>;
  body: Record<string, any>;
  clientIp?: string;
};

export type AppResponse = FastifyReply;
export type RawResponse = FastifyReply['raw'];
