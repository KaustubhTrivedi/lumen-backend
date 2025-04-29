    // src/context/context.service.ts
    import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
    import { LocationDto } from './dto/location.dto';
    import { CalendarService } from '../calendar/calendar.service';
    import { TasksService } from '../tasks/tasks.service';
    import { Task } from '../tasks/entities/task.entity';
    import { calendar_v3, google } from 'googleapis';
    import { McpPayload, McpContext, McpCalendarEvent } from './interfaces/mcp.interfaces';

    @Injectable()
    export class ContextService {
      private readonly logger = new Logger(ContextService.name);
      private latestLocation: LocationDto | null = null;

      constructor(
        private readonly calendarService: CalendarService,
        private readonly tasksService: TasksService,
      ) {}

      handleLocationUpdate(locationDto: LocationDto): void {
        this.logger.log(
          `ContextService received location update: Lat ${locationDto.latitude}, Lon ${locationDto.longitude}, Acc ${locationDto.accuracy || 'N/A'}`,
        );
        this.latestLocation = locationDto;
      }

      getLatestLocation(): LocationDto | null {
        return this.latestLocation;
      }

      async buildContextSnapshot(userId: string): Promise<McpPayload> {
        this.logger.log(`Building context snapshot for user: ${userId}...`);
        const now = new Date();

        const [timeContextResult, locationContextResult, calendarContextResult, tasksResult] = await Promise.allSettled([
            // 1. Get Time Context
            Promise.resolve({
                current_time: now.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin', hour12: false }),
                current_date: now.toLocaleDateString('en-IE', { timeZone: 'Europe/Dublin' }),
                timezone: 'Europe/Dublin',
            }),
            // 2. Get Location Context
            Promise.resolve(this.latestLocation ? {
                latitude: this.latestLocation.latitude,
                longitude: this.latestLocation.longitude,
                accuracy: this.latestLocation.accuracy,
            } : null),
            // 3. Get Calendar Context
            // ** Pass userId to listUpcomingEvents **
            this.calendarService.listUpcomingEvents(userId, 5) // Pass userId here
              .catch(error => {
                if (error instanceof UnauthorizedException) {
                    this.logger.warn(`Could not fetch calendar events for user ${userId}: Not authenticated.`);
                } else {
                    this.logger.error(`Error fetching calendar events for user ${userId}: ${error.message}`, error.stack);
                }
                return null;
            }),
             // 4. Get Tasks for the specific user
             this.tasksService.findAll(userId) // Pass userId here
               .catch(error => {
                this.logger.error(`Error fetching tasks for user ${userId}: ${error.message}`, error.stack);
                return [];
             })
        ]);

        // Process Calendar Results
        let finalCalendarContext: McpContext['calendar'] = null;
        if (calendarContextResult.status === 'fulfilled' && calendarContextResult.value) {
            const eventsRaw = calendarContextResult.value;
            finalCalendarContext = {
                upcoming_events: eventsRaw.map((event: calendar_v3.Schema$Event): McpCalendarEvent => ({
                    start_time: event.start?.dateTime ?? event.start?.date ?? null,
                    end_time: event.end?.dateTime ?? event.end?.date ?? null,
                    summary: event.summary ?? null,
                    location: event.location ?? null,
                })),
            };
            this.logger.log(`Included ${finalCalendarContext.upcoming_events.length} calendar events for user ${userId}.`);
        } else if (calendarContextResult.status === 'rejected' || !calendarContextResult.value) {
             this.logger.log(`Calendar events could not be fetched for user ${userId}.`);
        }

        // Process Tasks Results
        let finalTasks: Task[] = [];
        if (tasksResult.status === 'fulfilled') {
            finalTasks = tasksResult.value;
             this.logger.log(`Included ${finalTasks.length} tasks for user ${userId}.`);
        } else {
            this.logger.warn(`Tasks could not be fetched for user ${userId}.`);
        }

        // Assemble MCP Payload
        const mcpPayload: McpPayload = {
          user_id: userId,
          timestamp: now.toISOString(),
          context: {
            time: timeContextResult.status === 'fulfilled' ? timeContextResult.value : { current_time: '', current_date: '', timezone: '' },
            location: locationContextResult.status === 'fulfilled' ? locationContextResult.value : null,
            calendar: finalCalendarContext,
          },
          tasks: finalTasks,
        };

        this.logger.log(`Context snapshot built successfully for user ${userId}.`);
        return mcpPayload;
      }
    }
    