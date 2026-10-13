import { Module } from '@nestjs/common';
import { llmClientProvider } from './llm.provider';
import { LlmService } from './llm.service';

@Module({
  providers: [llmClientProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
