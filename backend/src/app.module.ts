import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { IcAgentModule } from './ic-agent/ic-agent.module';

@Module({
  imports: [IcAgentModule],
  controllers: [HealthController],
})
export class AppModule {}
