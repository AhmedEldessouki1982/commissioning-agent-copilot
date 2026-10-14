import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ElecAgentController } from './elec-agent.controller';
import { ElecAgentService } from './elec-agent.service';

@Module({
  imports: [LlmModule],
  controllers: [ElecAgentController],
  providers: [ElecAgentService],
  exports: [ElecAgentService],
})
export class ElecAgentModule {}
