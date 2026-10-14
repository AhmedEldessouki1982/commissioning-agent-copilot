import { Body, Controller, Post } from '@nestjs/common';
import type { AgentAskBody } from '../agents/agent.types';
import { validateMessage } from '../common/validate-message';
import {
  ManagerAgentService,
  type ManagerReply,
} from './manager-agent.service';

@Controller('manager')
export class ManagerAgentController {
  constructor(private readonly service: ManagerAgentService) {}

  @Post('ask')
  ask(@Body() body: AgentAskBody): Promise<ManagerReply> {
    return this.service.ask(validateMessage(body));
  }
}
