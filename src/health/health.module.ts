import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DeadlockHealthIndicator } from './deadlock.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DeadlockHealthIndicator],
})
export class HealthModule {}
