import { Injectable } from '@nestjs/common';
import { LlmService, type LlmCompletionResult } from '../llm/llm.service';
import { MECH_AGENT_SYSTEM_PROMPT } from './mech-agent.prompt';

export type MechAgentReply = LlmCompletionResult;

@Injectable()
export class MechAgentService {
  constructor(private readonly llm: LlmService) {}

  /** One independent request; all provider behavior lives in LlmService. */
  ask(message: string): Promise<MechAgentReply> {
    return this.llm.complete({ system: MECH_AGENT_SYSTEM_PROMPT, message });
  }
}
