import { Controller } from '@nestjs/common';
import { AgentController } from '../agents/agent.controller';
import { ElecAgentService } from './elec-agent.service';

@Controller('elec-agent')
export class ElecAgentController extends AgentController {
  constructor(service: ElecAgentService) {
    super(service);
  }
}
