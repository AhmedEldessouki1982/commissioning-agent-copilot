import { Injectable } from '@nestjs/common';
import { AgentService } from '../agents/agent.service';
import { LlmService } from '../llm/llm.service';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';

@Injectable()
export class IcAgentService extends AgentService {
  constructor(llm: LlmService) {
    super(llm, IC_AGENT_SYSTEM_PROMPT);
  }
}
