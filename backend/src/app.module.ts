import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { IcAgentModule } from './ic-agent/ic-agent.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [LlmModule, IcAgentModule],
  controllers: [HealthController],
})
export class AppModule {}
