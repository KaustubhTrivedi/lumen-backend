// src/ai-agent/ai-agent.module.ts
import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ContextModule } from '../context/context.module'; // Import ContextModule

@Module({
  imports: [ContextModule], // Import ContextModule to access ContextService
  providers: [AiAgentService],
  exports: [AiAgentService], // Export if needed by other modules later
})
export class AiAgentModule {}
