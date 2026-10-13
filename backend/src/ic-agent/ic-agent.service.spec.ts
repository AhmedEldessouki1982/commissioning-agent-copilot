import { Test, TestingModule } from '@nestjs/testing';
import { ANTHROPIC_CLIENT } from './anthropic.provider';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';
import { IcAgentService } from './ic-agent.service';

describe('IcAgentService', () => {
  let service: IcAgentService;
  const create = jest.fn();

  beforeEach(async () => {
    create.mockReset();
    create.mockResolvedValue({ content: [{ type: 'text', text: 'hello' }] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IcAgentService,
        { provide: ANTHROPIC_CLIENT, useValue: { messages: { create } } },
      ],
    }).compile();

    service = module.get<IcAgentService>(IcAgentService);
  });

  it('returns the joined reply text and the model, and calls the API once', async () => {
    const expectedModel = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5';

    const result = await service.ask('check loop');

    expect(result).toEqual({ reply: 'hello', model: expectedModel });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      model: expectedModel,
      max_tokens: 1024,
      system: IC_AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'check loop' }],
    });
  });
});
