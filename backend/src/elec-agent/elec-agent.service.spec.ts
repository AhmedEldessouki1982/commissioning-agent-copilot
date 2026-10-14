import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm/llm.service';
import { ELEC_AGENT_SYSTEM_PROMPT } from './elec-agent.prompt';
import { ElecAgentService } from './elec-agent.service';

describe('ElecAgentService', () => {
  let service: ElecAgentService;
  const complete = jest.fn();

  beforeEach(async () => {
    complete.mockReset();
    complete.mockResolvedValue({ reply: 'hello', model: 'test/model' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElecAgentService,
        { provide: LlmService, useValue: { complete } },
      ],
    }).compile();

    service = module.get<ElecAgentService>(ElecAgentService);
  });

  it('delegates to LlmService with the Elec system prompt and the message', async () => {
    const result = await service.ask('test the generator protection relays');

    expect(result).toEqual({ reply: 'hello', model: 'test/model' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({
      system: ELEC_AGENT_SYSTEM_PROMPT,
      message: 'test the generator protection relays',
    });
  });
});
