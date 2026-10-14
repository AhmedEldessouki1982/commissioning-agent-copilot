import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { MechAgentController } from './mech-agent.controller';
import { MechAgentService } from './mech-agent.service';

@Module({
  imports: [LlmModule],
  controllers: [MechAgentController],
  providers: [MechAgentService],
  exports: [MechAgentService],
})
export class MechAgentModule {}
