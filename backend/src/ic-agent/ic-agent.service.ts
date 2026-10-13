import { Injectable } from '@nestjs/common';
import { LlmService, type LlmCompletionResult } from '../llm/llm.service';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';

export type IcAgentReply = LlmCompletionResult;

@Injectable()
export class IcAgentService {
  constructor(private readonly llm: LlmService) {}

  /** One independent request; all provider behavior lives in LlmService. */
  ask(message: string): Promise<IcAgentReply> {
    return this.llm.complete({ system: IC_AGENT_SYSTEM_PROMPT, message });
  }
}
