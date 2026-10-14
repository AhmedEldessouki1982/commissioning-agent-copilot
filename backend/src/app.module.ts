import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ElecAgentModule } from './elec-agent/elec-agent.module';
import { IcAgentModule } from './ic-agent/ic-agent.module';
import { LlmModule } from './llm/llm.module';
import { MechAgentModule } from './mech-agent/mech-agent.module';

@Module({
  imports: [LlmModule, IcAgentModule, MechAgentModule, ElecAgentModule],
  controllers: [HealthController],
})
export class AppModule {}
