import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AgentService } from '../agents/agent.service';
import { ElecAgentService } from '../elec-agent/elec-agent.service';
import { IcAgentService } from '../ic-agent/ic-agent.service';
import { LlmService } from '../llm/llm.service';
import { MechAgentService } from '../mech-agent/mech-agent.service';
import { MANAGER_AGENT_SYSTEM_PROMPT } from './manager-agent.prompt';

export type SpecialistKey = 'ic' | 'mech' | 'elec';

export interface ManagerReply {
  /** The specialist that answered, or null when nothing applies. */
  agent: SpecialistKey | null;
  /** One short sentence explaining the routing decision. */
  reason: string;
  reply: string;
  model: string;
}

type RoutingTarget = SpecialistKey | 'none';

interface RoutingDecision {
  target: RoutingTarget;
  reason: string;
}

const NO_SPECIALIST_REPLY =
  'No specialist agent covers this yet. Available: I&C, Mech, Elec.';
const MAX_REASON_LENGTH = 300;
const PROVIDER_ERROR = 'AI provider error';
const ROUTING_TARGETS: readonly string[] = ['ic', 'mech', 'elec', 'none'];

/** Trim, drop a ```json code fence if present, and parse; throws on bad JSON. */
function stripCodeFence(raw: string): string {
  const text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  return fenced?.[1]?.trim() ?? text;
}

/**
 * Strictly validate the router's reply. The model is untrusted input: anything
 * that is not an object with an allowed `agent` and a string `reason` is a
 * failure, and the caller turns that into a clean 502.
 */
function parseRoutingDecision(raw: string): RoutingDecision {
  const parsed = JSON.parse(stripCodeFence(raw)) as unknown;

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('routing decision is not an object');
  }

  const { agent, reason } = parsed as { agent?: unknown; reason?: unknown };
  if (typeof agent !== 'string' || !ROUTING_TARGETS.includes(agent)) {
    throw new Error('routing decision has an unknown agent');
  }
  if (typeof reason !== 'string') {
    throw new Error('routing decision has no reason');
  }

  return {
    target: agent as RoutingTarget,
    reason: reason.slice(0, MAX_REASON_LENGTH),
  };
}

/**
 * The manager: asks the router which specialist owns the question, then hands
 * the original message to that one specialist. It never answers domain
 * questions itself and never fans out to more than one specialist.
 */
@Injectable()
export class ManagerAgentService {
  private readonly logger = new Logger(ManagerAgentService.name);
  private readonly specialists: Record<SpecialistKey, AgentService>;

  constructor(
    private readonly llm: LlmService,
    private readonly ic: IcAgentService,
    private readonly mech: MechAgentService,
    private readonly elec: ElecAgentService,
  ) {
    this.specialists = { ic: this.ic, mech: this.mech, elec: this.elec };
  }

  async ask(message: string): Promise<ManagerReply> {
    const { reply } = await this.llm.complete({
      system: MANAGER_AGENT_SYSTEM_PROMPT,
      message,
    });

    const decision = this.parseOrThrow(reply);
    this.logger.log(`routed to ${decision.target}: ${decision.reason}`);

    if (decision.target === 'none') {
      return {
        agent: null,
        reason: decision.reason,
        reply: NO_SPECIALIST_REPLY,
        model: process.env.OPENROUTER_MODEL ?? '',
      };
    }

    const { reply: answer, model } =
      await this.specialists[decision.target].ask(message);

    return {
      agent: decision.target,
      reason: decision.reason,
      reply: answer,
      model,
    };
  }

  private parseOrThrow(raw: string): RoutingDecision {
    try {
      return parseRoutingDecision(raw);
    } catch (error) {
      // Log the short reason only — never the model's full output.
      this.logger.error(
        'Manager could not parse the routing decision',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadGatewayException(PROVIDER_ERROR);
    }
  }
}
