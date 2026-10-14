import { Module } from '@nestjs/common';
import { ElecAgentModule } from '../elec-agent/elec-agent.module';
import { IcAgentModule } from '../ic-agent/ic-agent.module';
import { LlmModule } from '../llm/llm.module';
import { MechAgentModule } from '../mech-agent/mech-agent.module';
import { ManagerAgentController } from './manager-agent.controller';
import { ManagerAgentService } from './manager-agent.service';

@Module({
  imports: [LlmModule, IcAgentModule, MechAgentModule, ElecAgentModule],
  controllers: [ManagerAgentController],
  providers: [ManagerAgentService],
})
export class ManagerAgentModule {}
