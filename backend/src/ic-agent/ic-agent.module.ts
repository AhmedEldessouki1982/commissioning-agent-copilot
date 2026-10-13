import { Module } from '@nestjs/common';
import { IcAgentController } from './ic-agent.controller';
import { IcAgentService } from './ic-agent.service';
import { anthropicClientProvider } from './anthropic.provider';

@Module({
  controllers: [IcAgentController],
  providers: [IcAgentService, anthropicClientProvider],
})
export class IcAgentModule {}
