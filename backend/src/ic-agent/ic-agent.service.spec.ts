import { Test, TestingModule } from '@nestjs/testing';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';
import { IcAgentService } from './ic-agent.service';
import { LLM_CLIENT } from './llm.provider';

describe('IcAgentService', () => {
  let service: IcAgentService;
  const create = jest.fn();
  const TEST_MODEL = 'test/model';
  const previousModel = process.env.OPENROUTER_MODEL;

  beforeEach(async () => {
    process.env.OPENROUTER_MODEL = TEST_MODEL;
    create.mockReset();
    create.mockResolvedValue({ choices: [{ message: { content: 'hello' } }] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IcAgentService,
        {
          provide: LLM_CLIENT,
          useValue: { chat: { completions: { create } } },
        },
      ],
    }).compile();

    service = module.get<IcAgentService>(IcAgentService);
  });

  afterAll(() => {
    if (previousModel === undefined) {
      delete process.env.OPENROUTER_MODEL;
    } else {
      process.env.OPENROUTER_MODEL = previousModel;
    }
  });

  it('returns the reply content and the model, and calls the API once', async () => {
    const result = await service.ask('check loop');

    expect(result).toEqual({ reply: 'hello', model: TEST_MODEL });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      model: TEST_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: IC_AGENT_SYSTEM_PROMPT },
        { role: 'user', content: 'check loop' },
      ],
    });
  });
});
