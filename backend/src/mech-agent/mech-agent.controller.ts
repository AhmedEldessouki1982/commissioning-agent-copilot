import { Controller } from '@nestjs/common';
import { AgentController } from '../agents/agent.controller';
import { MechAgentService } from './mech-agent.service';

@Controller('mech-agent')
export class MechAgentController extends AgentController {
  constructor(service: MechAgentService) {
    super(service);
  }
}
