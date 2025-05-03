import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { err, ok, Result } from 'neverthrow';

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
  ): Promise<Result<R, Error>> {
    if (!(await this.acquireLock(lockKey, releaseTime))) {
      return err(
        new Error(`Failed to acquire lock ${lockKey} for ${releaseTime}ms`),
      );
    }
    try {
      return ok(await fn());
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
      'PX',
      releaseTime,
      'NX',
    );

    return !!acquired;
  }

  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }
}
