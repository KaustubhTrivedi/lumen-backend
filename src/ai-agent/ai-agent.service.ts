    // src/ai-agent/ai-agent.service.ts
    import { Injectable, Logger } from '@nestjs/common';
    import { ContextService } from '../context/context.service'; // Import ContextService
    import { McpPayload } from '../context/interfaces/mcp.interfaces'; // Import MCP interfaces
    import { Task } from '../tasks/entities/task.entity'; // Import Task entity

    // Define a simple structure for the prioritized task output
    // Could include score, reason, etc. later
    export interface PrioritizedTask extends Task {
        priorityScore: number; // Simple score for now
        priorityReason?: string; // Optional reason
    }


    @Injectable()
    export class AiAgentService {
        private readonly logger = new Logger(AiAgentService.name);

        // Inject ContextService to get the MCP payload
        constructor(private readonly contextService: ContextService) {}

        /**
         * Analyzes the user's context and tasks to provide a prioritized list.
         * Initial version: Prioritizes based solely on due date proximity.
         * @param userId - The ID of the user whose tasks to prioritize.
         * @returns A Promise resolving to an array of tasks sorted by priority.
         */
        async prioritizeTasks(userId: string): Promise<PrioritizedTask[]> {
            this.logger.log(`Starting task prioritization for user ${userId}...`);

            // 1. Get the current context snapshot
            const mcpPayload: McpPayload = await this.contextService.buildContextSnapshot(userId);
            const tasks = mcpPayload.tasks; // Get the user's tasks from the payload
            const now = new Date(); // Current time for comparison

            if (!tasks || tasks.length === 0) {
                this.logger.log(`No tasks found for user ${userId} to prioritize.`);
                return []; // Return empty array if no tasks
            }

            // 2. Calculate Priority Score (Simple Due Date Logic)
            const scoredTasks = tasks.map(task => {
                let priorityScore = 0; // Lower score = higher priority for sorting
                let priorityReason = 'Default priority';

                if (task.isComplete) {
                    priorityScore = Infinity; // Completed tasks have lowest priority
                    priorityReason = 'Task is complete';
                } else if (task.dueDate) {
                    const dueDate = new Date(task.dueDate); // Ensure it's a Date object
                    const timeDiff = dueDate.getTime() - now.getTime(); // Difference in milliseconds

                    if (timeDiff < 0) {
                        // Overdue tasks - highest priority
                        // Score based on how overdue (more overdue = slightly lower score/higher priority)
                        priorityScore = timeDiff; // Negative value, more negative is more overdue
                        priorityReason = `Overdue by ${this.formatTimeDiff(Math.abs(timeDiff))}`;
                    } else {
                        // Upcoming tasks - score based on proximity
                        // Closer due date = lower positive score = higher priority
                        priorityScore = timeDiff;
                        priorityReason = `Due in ${this.formatTimeDiff(timeDiff)}`;
                    }
                } else {
                    // Tasks without due dates - assign a high positive score (low priority)
                    priorityScore = Number.MAX_SAFE_INTEGER; // Very low priority
                    priorityReason = 'No due date';
                }

                // Return the task with the calculated score and reason
                return {
                    ...task,
                    priorityScore,
                    priorityReason,
                };
            });

            // 3. Sort Tasks by Score (Ascending - lower score is higher priority)
            const sortedTasks = scoredTasks.sort((a, b) => a.priorityScore - b.priorityScore);

            this.logger.log(`Prioritization complete for user ${userId}. Returning ${sortedTasks.length} tasks.`);
            // Log the top few tasks for debugging (optional)
            // console.log("Top 3 prioritized tasks:", sortedTasks.slice(0, 3).map(t => ({ title: t.title, score: t.priorityScore, reason: t.priorityReason })));

            return sortedTasks;
        }

        /**
         * Helper function to format time difference into a readable string.
         * @param ms - Time difference in milliseconds.
         * @returns A human-readable string (e.g., "2 days", "5 hours").
         */
        private formatTimeDiff(ms: number): string {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 1) return `${days} days`;
            if (days === 1) return `1 day`;
            if (hours > 1) return `${hours} hours`;
            if (hours === 1) return `1 hour`;
            if (minutes > 1) return `${minutes} minutes`;
            if (minutes === 1) return `1 minute`;
            return `${seconds} seconds`;
        }
    }
    