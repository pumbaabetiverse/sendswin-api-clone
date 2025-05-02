import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  getRedis() {
    return this.redis;
  }

  async executeWithLock<R>(
    lockKey: string,
    releaseTime: number,
    fn: () => Promise<R>,
  ): Promise<R> {
    if (!(await this.acquireLock(lockKey, releaseTime))) {
      throw new Error('Failed to acquire lock');
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async acquireLock(
    lockKey: string,
    releaseTime: number,
  ): Promise<boolean> {
    const acquired = await this.redis.set(
      lockKey,
      '1',
      'EX',
      releaseTime,
      'NX',
    );

    return !!acquired;
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
