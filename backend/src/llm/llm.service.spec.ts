import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LLM_CLIENT } from './llm.provider';
import { LlmService } from './llm.service';

describe('LlmService', () => {
  let service: LlmService;
  const create = jest.fn();
  const TEST_MODEL = 'test/model';
  const TEST_SYSTEM = 'system prompt';
  const previousModel = process.env.OPENROUTER_MODEL;

  beforeEach(async () => {
    process.env.OPENROUTER_MODEL = TEST_MODEL;
    create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: LLM_CLIENT,
          useValue: { chat: { completions: { create } } },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  afterAll(() => {
    if (previousModel === undefined) {
      delete process.env.OPENROUTER_MODEL;
    } else {
      process.env.OPENROUTER_MODEL = previousModel;
    }
  });

  it('returns the reply content and the model, and calls the API once', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: 'hello' } }] });

    const result = await service.complete({
      system: TEST_SYSTEM,
      message: 'check loop',
    });

    expect(result).toEqual({ reply: 'hello', model: TEST_MODEL });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      model: TEST_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: TEST_SYSTEM },
        { role: 'user', content: 'check loop' },
      ],
    });
  });

  it('throws BadGatewayException when there are no choices or empty content', async () => {
    create.mockResolvedValueOnce({ choices: [] });
    await expect(
      service.complete({ system: TEST_SYSTEM, message: 'check loop' }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    create.mockResolvedValueOnce({ choices: [{ message: { content: '' } }] });
    await expect(
      service.complete({ system: TEST_SYSTEM, message: 'check loop' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws BadGatewayException when the SDK call fails', async () => {
    create.mockRejectedValue(new Error('boom'));

    await expect(
      service.complete({ system: TEST_SYSTEM, message: 'check loop' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
