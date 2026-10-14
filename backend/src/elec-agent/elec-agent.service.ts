import { Injectable } from '@nestjs/common';
import { LlmService, type LlmCompletionResult } from '../llm/llm.service';
import { ELEC_AGENT_SYSTEM_PROMPT } from './elec-agent.prompt';

export type ElecAgentReply = LlmCompletionResult;

@Injectable()
export class ElecAgentService {
  constructor(private readonly llm: LlmService) {}

  /** One independent request; all provider behavior lives in LlmService. */
  ask(message: string): Promise<ElecAgentReply> {
    return this.llm.complete({ system: ELEC_AGENT_SYSTEM_PROMPT, message });
  }
}
