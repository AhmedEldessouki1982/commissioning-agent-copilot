import { Body, Post } from '@nestjs/common';
import { validateMessage } from '../common/validate-message';
import type { LlmCompletionResult } from '../llm/llm.service';
import { AgentService } from './agent.service';
import type { AgentAskBody } from './agent.types';

/**
 * Shared `/ask` route. A subclass only adds `@Controller('<agent>')` and
 * injects its own AgentService — the handler and its validation are inherited,
 * so the request contract stays identical across every agent.
 */
export abstract class AgentController {
  constructor(protected readonly service: AgentService) {}

  @Post('ask')
  ask(@Body() body: AgentAskBody): Promise<LlmCompletionResult> {
    return this.service.ask(validateMessage(body));
  }
}
