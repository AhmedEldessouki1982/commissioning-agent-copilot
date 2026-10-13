import { Module } from '@nestjs/common';
import { IcAgentController } from './ic-agent.controller';
import { IcAgentService } from './ic-agent.service';
import { llmClientProvider } from './llm.provider';

@Module({
  controllers: [IcAgentController],
  providers: [IcAgentService, llmClientProvider],
})
export class IcAgentModule {}
