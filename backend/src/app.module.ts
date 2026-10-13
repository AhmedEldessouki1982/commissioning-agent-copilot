import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { IcAgentModule } from './ic-agent/ic-agent.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), IcAgentModule],
  controllers: [HealthController],
})
export class AppModule {}
