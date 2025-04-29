    // src/ai-agent/ai-agent.controller.ts
    import { Controller, Get, UseGuards, Req, Logger } from '@nestjs/common';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import guard
    import { Request } from 'express'; // Import Request type
    import { JwtPayload } from '../auth/strategies/jwt.strategy'; // Import payload type
    import { AiAgentService, PrioritizedTask } from './ai-agent.service'; // Import service and return type

    @Controller('ai-agent') // Base route /ai-agent
    @UseGuards(JwtAuthGuard) // Protect all routes in this controller
    export class AiAgentController {
        private readonly logger = new Logger(AiAgentController.name);

        constructor(private readonly aiAgentService: AiAgentService) {}

        /**
         * GET /ai-agent/prioritized-tasks
         * Endpoint to get the user's tasks prioritized by the AI agent.
         * @param req - The request object containing the authenticated user payload.
         * @returns A list of tasks sorted by priority.
         */
        @Get('prioritized-tasks')
        async getPrioritizedTasks(@Req() req: Request): Promise<PrioritizedTask[]> {
            const user = req.user as JwtPayload;
            this.logger.log(`Request received for prioritized tasks for user ${user.sub}`);
            return this.aiAgentService.prioritizeTasks(user.sub);
        }
    }
    