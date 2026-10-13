import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { IcAgentController } from './ic-agent.controller';
import { IcAgentService } from './ic-agent.service';

@Module({
  imports: [LlmModule],
  controllers: [IcAgentController],
  providers: [IcAgentService],
})
export class IcAgentModule {}
