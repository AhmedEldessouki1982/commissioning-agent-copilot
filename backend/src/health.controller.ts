import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'commissioning-orchestra-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
