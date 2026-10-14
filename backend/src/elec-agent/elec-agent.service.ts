import { Injectable } from '@nestjs/common';
import { AgentService } from '../agents/agent.service';
import { LlmService } from '../llm/llm.service';
import { ELEC_AGENT_SYSTEM_PROMPT } from './elec-agent.prompt';

@Injectable()
export class ElecAgentService extends AgentService {
  constructor(llm: LlmService) {
    super(llm, ELEC_AGENT_SYSTEM_PROMPT);
  }
}
