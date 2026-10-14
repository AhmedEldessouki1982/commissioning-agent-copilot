import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm/llm.service';
import { MECH_AGENT_SYSTEM_PROMPT } from './mech-agent.prompt';
import { MechAgentService } from './mech-agent.service';

describe('MechAgentService', () => {
  let service: MechAgentService;
  const complete = jest.fn();

  beforeEach(async () => {
    complete.mockReset();
    complete.mockResolvedValue({ reply: 'hello', model: 'test/model' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MechAgentService,
        { provide: LlmService, useValue: { complete } },
      ],
    }).compile();

    service = module.get<MechAgentService>(MechAgentService);
  });

  it('delegates to LlmService with the Mech system prompt and the message', async () => {
    const result = await service.ask('flush the lube oil');

    expect(result).toEqual({ reply: 'hello', model: 'test/model' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({
      system: MECH_AGENT_SYSTEM_PROMPT,
      message: 'flush the lube oil',
    });
  });
});
