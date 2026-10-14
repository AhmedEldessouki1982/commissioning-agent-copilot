import { Injectable } from '@nestjs/common';
import { AgentService } from '../agents/agent.service';
import { LlmService } from '../llm/llm.service';
import { MECH_AGENT_SYSTEM_PROMPT } from './mech-agent.prompt';

@Injectable()
export class MechAgentService extends AgentService {
  constructor(llm: LlmService) {
    super(llm, MECH_AGENT_SYSTEM_PROMPT);
  }
}
