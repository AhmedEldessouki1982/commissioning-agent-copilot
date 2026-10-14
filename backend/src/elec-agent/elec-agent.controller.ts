import { Body, Controller, Post } from '@nestjs/common';
import { validateMessage } from '../common/validate-message';
import { ElecAgentService, type ElecAgentReply } from './elec-agent.service';

export interface ElecAgentAskBody {
  message?: unknown;
}

@Controller('elec-agent')
export class ElecAgentController {
  constructor(private readonly service: ElecAgentService) {}

  @Post('ask')
  async ask(@Body() body: ElecAgentAskBody): Promise<ElecAgentReply> {
    return this.service.ask(validateMessage(body));
  }
}
