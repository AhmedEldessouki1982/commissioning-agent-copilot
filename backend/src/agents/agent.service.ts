import { LlmService, type LlmCompletionResult } from '../llm/llm.service';

/**
 * Shared behavior for every commissioning agent: exactly one independent,
 * stateless completion. A subclass only supplies its system prompt, so adding
 * a new agent never re-implements provider handling.
 */
export abstract class AgentService {
  constructor(
    protected readonly llm: LlmService,
    protected readonly systemPrompt: string,
  ) {}

  /** One independent request; all provider behavior lives in LlmService. */
  ask(message: string): Promise<LlmCompletionResult> {
    return this.llm.complete({ system: this.systemPrompt, message });
  }
}
