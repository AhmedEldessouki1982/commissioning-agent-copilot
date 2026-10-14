import { Test } from '@nestjs/testing';
import { ELEC_AGENT_SYSTEM_PROMPT } from '../elec-agent/elec-agent.prompt';
import { ElecAgentService } from '../elec-agent/elec-agent.service';
import { IC_AGENT_SYSTEM_PROMPT } from '../ic-agent/ic-agent.prompt';
import { IcAgentService } from '../ic-agent/ic-agent.service';
import { LlmService } from '../llm/llm.service';
import { MECH_AGENT_SYSTEM_PROMPT } from '../mech-agent/mech-agent.prompt';
import { MechAgentService } from '../mech-agent/mech-agent.service';
import type { AgentService } from './agent.service';

const SAMPLE_REPLY = { reply: 'hello', model: 'test/model' };

const agents = [
  {
    name: 'IcAgentService',
    service: IcAgentService,
    prompt: IC_AGENT_SYSTEM_PROMPT,
    message: 'check loop',
  },
  {
    name: 'MechAgentService',
    service: MechAgentService,
    prompt: MECH_AGENT_SYSTEM_PROMPT,
    message: 'flush the lube oil',
  },
  {
    name: 'ElecAgentService',
    service: ElecAgentService,
    prompt: ELEC_AGENT_SYSTEM_PROMPT,
    message: 'test the generator protection relays',
  },
] as const;

describe.each(agents)('$name', ({ service: Service, prompt, message }) => {
  it('delegates to LlmService with its system prompt and the message', async () => {
    const complete = jest.fn().mockResolvedValue(SAMPLE_REPLY);
    const module = await Test.createTestingModule({
      providers: [Service, { provide: LlmService, useValue: { complete } }],
    }).compile();
    const service = module.get<AgentService>(Service);

    await expect(service.ask(message)).resolves.toEqual(SAMPLE_REPLY);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({ system: prompt, message });
  });
});
