    // src/context/interfaces/mcp.interfaces.ts
    import { Task } from '../../tasks/entities/task.entity'; // Import the Task entity

    // Define a type for the structure of calendar events within the context
    export interface McpCalendarEvent {
        start_time: string | null | undefined;
        end_time: string | null | undefined;
        summary: string | null | undefined;
        location?: string | null | undefined;
    }

    // Define the structure for the 'context' part of the MCP payload
    export interface McpContext {
        location: {
            latitude: number;
            longitude: number;
            accuracy?: number;
        } | null;
        time: {
            current_time: string;
            current_date: string;
            timezone: string;
        };
        calendar: {
            upcoming_events: McpCalendarEvent[];
        } | null;
        // Add communication, learned_dependencies interfaces here later
    }

    // Define the overall structure for the MCP payload
    export interface McpPayload {
        user_id: string; // Placeholder for now
        timestamp: string; // ISO 8601 timestamp
        context: McpContext;
        tasks: Task[]; // Use the imported Task entity type here
    }
    