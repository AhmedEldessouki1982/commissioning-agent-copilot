import { Body, Controller, Post } from '@nestjs/common';
import { validateMessage } from '../common/validate-message';
import { MechAgentService, type MechAgentReply } from './mech-agent.service';

export interface MechAgentAskBody {
  message?: unknown;
}

@Controller('mech-agent')
export class MechAgentController {
  constructor(private readonly service: MechAgentService) {}

  @Post('ask')
  async ask(@Body() body: MechAgentAskBody): Promise<MechAgentReply> {
    return this.service.ask(validateMessage(body));
  }
}
