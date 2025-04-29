// src/ai-agent/ai-agent.module.ts
import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ContextModule } from '../context/context.module'; // Import ContextModule
import { AiAgentController } from './ai-agent.controller';

@Module({
  imports: [ContextModule],
  providers: [AiAgentService],
  exports: [AiAgentService],
  controllers: [AiAgentController],
})
export class AiAgentModule {}
