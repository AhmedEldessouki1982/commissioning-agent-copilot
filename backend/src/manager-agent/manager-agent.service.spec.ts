import { BadGatewayException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ElecAgentService } from '../elec-agent/elec-agent.service';
import { IcAgentService } from '../ic-agent/ic-agent.service';
import { LlmService } from '../llm/llm.service';
import { MechAgentService } from '../mech-agent/mech-agent.service';
import { ManagerAgentService } from './manager-agent.service';

const TEST_MODEL = 'test/model';
const SPECIALIST_ANSWER = { reply: 'specialist answer', model: TEST_MODEL };
const NO_SPECIALIST_REPLY =
  'No specialist agent covers this yet. Available: I&C, Mech, Elec.';

describe('ManagerAgentService', () => {
  let service: ManagerAgentService;
  const complete = jest.fn();
  const icAsk = jest.fn();
  const mechAsk = jest.fn();
  const elecAsk = jest.fn();
  const previousModel = process.env.OPENROUTER_MODEL;

  beforeEach(async () => {
    process.env.OPENROUTER_MODEL = TEST_MODEL;
    complete.mockReset();
    icAsk.mockReset().mockResolvedValue(SPECIALIST_ANSWER);
    mechAsk.mockReset().mockResolvedValue(SPECIALIST_ANSWER);
    elecAsk.mockReset().mockResolvedValue(SPECIALIST_ANSWER);

    const module = await Test.createTestingModule({
      providers: [
        ManagerAgentService,
        { provide: LlmService, useValue: { complete } },
        { provide: IcAgentService, useValue: { ask: icAsk } },
        { provide: MechAgentService, useValue: { ask: mechAsk } },
        { provide: ElecAgentService, useValue: { ask: elecAsk } },
      ],
    }).compile();

    service = module.get<ManagerAgentService>(ManagerAgentService);
  });

  afterAll(() => {
    if (previousModel === undefined) {
      delete process.env.OPENROUTER_MODEL;
    } else {
      process.env.OPENROUTER_MODEL = previousModel;
    }
  });

  const specialists = [
    { target: 'ic' as const, ask: icAsk },
    { target: 'mech' as const, ask: mechAsk },
    { target: 'elec' as const, ask: elecAsk },
  ];

  it.each(specialists)(
    'routes a $target question to the $target specialist with the original message',
    async ({ target, ask }) => {
      complete.mockResolvedValue({
        reply: JSON.stringify({ agent: target, reason: 'because' }),
        model: TEST_MODEL,
      });

      const result = await service.ask('the manager question');

      expect(ask).toHaveBeenCalledTimes(1);
      expect(ask).toHaveBeenCalledWith('the manager question');
      expect(result).toEqual({
        agent: target,
        reason: 'because',
        ...SPECIALIST_ANSWER,
      });
    },
  );

  it('parses a routing decision wrapped in a json code fence', async () => {
    complete.mockResolvedValue({
      reply: '```json\n{"agent":"mech","reason":"rotating equipment"}\n```',
      model: TEST_MODEL,
    });

    const result = await service.ask('alignment check');

    expect(mechAsk).toHaveBeenCalledWith('alignment check');
    expect(result.agent).toBe('mech');
    expect(result.reason).toBe('rotating equipment');
  });

  it('parses a decision preceded by prose', async () => {
    complete.mockResolvedValue({
      reply: 'Here is my decision: {"agent":"ic","reason":"loop checks"}',
      model: TEST_MODEL,
    });

    const result = await service.ask('loop check question');

    expect(icAsk).toHaveBeenCalledWith('loop check question');
    expect(result.agent).toBe('ic');
    expect(result.reason).toBe('loop checks');
  });

  it('parses a decision followed by prose', async () => {
    complete.mockResolvedValue({
      reply:
        '{"agent":"mech","reason":"rotating equipment"} — that is my answer.',
      model: TEST_MODEL,
    });

    const result = await service.ask('alignment question');

    expect(mechAsk).toHaveBeenCalledWith('alignment question');
    expect(result.agent).toBe('mech');
    expect(result.reason).toBe('rotating equipment');
  });

  it('rejects a reply with no JSON object, without calling a specialist', async () => {
    complete.mockResolvedValue({
      reply: 'sorry, I cannot help with that',
      model: TEST_MODEL,
    });

    await expect(service.ask('question')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(icAsk).not.toHaveBeenCalled();
    expect(mechAsk).not.toHaveBeenCalled();
    expect(elecAsk).not.toHaveBeenCalled();
  });

  it('returns a fixed reply for "none" without calling a specialist', async () => {
    complete.mockResolvedValue({
      reply: '{"agent":"none","reason":"scheduling is out of scope"}',
      model: TEST_MODEL,
    });

    const result = await service.ask('update the schedule');

    expect(icAsk).not.toHaveBeenCalled();
    expect(mechAsk).not.toHaveBeenCalled();
    expect(elecAsk).not.toHaveBeenCalled();
    expect(result).toEqual({
      agent: null,
      reason: 'scheduling is out of scope',
      reply: NO_SPECIALIST_REPLY,
      model: TEST_MODEL,
    });
  });

  const badReplies = [
    { label: 'invalid JSON', reply: 'definitely not json' },
    { label: 'an unknown agent', reply: '{"agent":"hse","reason":"safety"}' },
    { label: 'a missing reason', reply: '{"agent":"ic"}' },
    { label: 'a non-object payload', reply: '"ic"' },
  ];

  it.each(badReplies)(
    'rejects a routing reply with $label',
    async ({ reply }) => {
      complete.mockResolvedValue({ reply, model: TEST_MODEL });

      await expect(service.ask('question')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(icAsk).not.toHaveBeenCalled();
      expect(mechAsk).not.toHaveBeenCalled();
      expect(elecAsk).not.toHaveBeenCalled();
    },
  );
});
