import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm/llm.service';
import { IC_AGENT_SYSTEM_PROMPT } from './ic-agent.prompt';
import { IcAgentService } from './ic-agent.service';

describe('IcAgentService', () => {
  let service: IcAgentService;
  const complete = jest.fn();

  beforeEach(async () => {
    complete.mockReset();
    complete.mockResolvedValue({ reply: 'hello', model: 'test/model' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IcAgentService,
        { provide: LlmService, useValue: { complete } },
      ],
    }).compile();

    service = module.get<IcAgentService>(IcAgentService);
  });

  it('delegates to LlmService with the I&C system prompt and the message', async () => {
    const result = await service.ask('check loop');

    expect(result).toEqual({ reply: 'hello', model: 'test/model' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({
      system: IC_AGENT_SYSTEM_PROMPT,
      message: 'check loop',
    });
  });
});
