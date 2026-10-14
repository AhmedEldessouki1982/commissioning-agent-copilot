import { Controller } from '@nestjs/common';
import { AgentController } from '../agents/agent.controller';
import { IcAgentService } from './ic-agent.service';

@Controller('ic-agent')
export class IcAgentController extends AgentController {
  constructor(service: IcAgentService) {
    super(service);
  }
}
