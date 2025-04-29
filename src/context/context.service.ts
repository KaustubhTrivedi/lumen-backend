// src/context/context.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LocationDto } from './dto/location.dto';
import { CalendarService } from '../calendar/calendar.service';
import { TasksService } from '../tasks/tasks.service';
import { Task } from '../tasks/entities/task.entity';
import { calendar_v3, google } from 'googleapis';
import {
  McpPayload,
  McpContext,
  McpCalendarEvent,
} from './interfaces/mcp.interfaces';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  // Use a Map to store latest location per user ID
  private userLocations = new Map<string, LocationDto>();

  constructor(
    private readonly calendarService: CalendarService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Handles incoming location updates for a specific user.
   * Stores the latest location for that user in memory.
   * @param userId - The ID of the user providing the location.
   * @param locationDto - The location data received.
   */
  // ** Accept userId **
  handleLocationUpdate(userId: string, locationDto: LocationDto): void {
    this.logger.log(
      `ContextService received location update for user ${userId}: Lat ${locationDto.latitude}, Lon ${locationDto.longitude}, Acc ${locationDto.accuracy || 'N/A'}`,
    );
    // ** Store location against userId in the Map **
    this.userLocations.set(userId, locationDto);
  }

  /**
   * Retrieves the latest known location stored for a specific user.
   * @param userId - The ID of the user whose location to retrieve.
   * @returns The latest LocationDto for the user, or null if none exists.
   */
  // ** Accept userId **
  getLatestLocation(userId: string): LocationDto | null {
    // ** Retrieve location for the specific userId from the Map **
    return this.userLocations.get(userId) || null;
  }

  /**
   * Assembles a snapshot of the current context for a specific user.
   * @param userId - The ID of the user whose context is being built.
   * @returns The MCP payload object.
   */
  async buildContextSnapshot(userId: string): Promise<McpPayload> {
    this.logger.log(`Building context snapshot for user: ${userId}...`);
    const now = new Date();

    // --- Fetch Context Data Concurrently ---
    const [
      timeContextResult,
      locationContextResult,
      calendarContextResult,
      tasksResult,
    ] = await Promise.allSettled([
      // 1. Get Time Context
      Promise.resolve({
        current_time: now.toLocaleTimeString('en-IE', {
          timeZone: 'Europe/Dublin',
          hour12: false,
        }),
        current_date: now.toLocaleDateString('en-IE', {
          timeZone: 'Europe/Dublin',
        }),
        timezone: 'Europe/Dublin',
      }),
      // 2. Get Location Context for the specific user
      // ** Call updated getLatestLocation with userId **
      Promise.resolve(this.getLatestLocation(userId)), // Already returns null if not found
      // 3. Get Calendar Context
      this.calendarService.listUpcomingEvents(userId, 5).catch((error) => {
        if (error instanceof UnauthorizedException) {
          this.logger.warn(
            `Could not fetch calendar events for user ${userId}: Not authenticated.`,
          );
        } else {
          this.logger.error(
            `Error fetching calendar events for user ${userId}: ${error.message}`,
            error.stack,
          );
        }
        return null;
      }),
      // 4. Get Tasks for the specific user
      this.tasksService.findAll(userId).catch((error) => {
        this.logger.error(
          `Error fetching tasks for user ${userId}: ${error.message}`,
          error.stack,
        );
        return [];
      }),
    ]);
    // --- End Concurrent Fetching ---

    // Process Calendar Results
    let finalCalendarContext: McpContext['calendar'] = null;
    if (
      calendarContextResult.status === 'fulfilled' &&
      calendarContextResult.value
    ) {
      const eventsRaw = calendarContextResult.value;
      finalCalendarContext = {
        upcoming_events: eventsRaw.map(
          (event: calendar_v3.Schema$Event): McpCalendarEvent => ({
            start_time: event.start?.dateTime ?? event.start?.date ?? null,
            end_time: event.end?.dateTime ?? event.end?.date ?? null,
            summary: event.summary ?? null,
            location: event.location ?? null,
          }),
        ),
      };
      this.logger.log(
        `Included ${finalCalendarContext.upcoming_events.length} calendar events for user ${userId}.`,
      );
    } else {
      this.logger.log(
        `Calendar events could not be fetched for user ${userId}.`,
      );
    }

    // Process Tasks Results
    let finalTasks: Task[] = [];
    if (tasksResult.status === 'fulfilled') {
      finalTasks = tasksResult.value;
      this.logger.log(
        `Included ${finalTasks.length} tasks for user ${userId}.`,
      );
    } else {
      this.logger.warn(`Tasks could not be fetched for user ${userId}.`);
    }

    // Process Location Result (already resolved or null)
    const finalLocationContext =
      locationContextResult.status === 'fulfilled'
        ? locationContextResult.value
        : null;

    // Assemble MCP Payload
    const mcpPayload: McpPayload = {
      user_id: userId,
      timestamp: now.toISOString(),
      context: {
        time:
          timeContextResult.status === 'fulfilled'
            ? timeContextResult.value
            : { current_time: '', current_date: '', timezone: '' },
        location: finalLocationContext, // Use the resolved location
        calendar: finalCalendarContext,
      },
      tasks: finalTasks,
    };

    this.logger.log(`Context snapshot built successfully for user ${userId}.`);
    return mcpPayload;
  }
}
