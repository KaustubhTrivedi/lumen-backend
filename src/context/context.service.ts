    // src/context/context.service.ts
    import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
    import { LocationDto } from './dto/location.dto';
    import { CalendarService } from '../calendar/calendar.service'; // Import CalendarService
    import { TasksService } from '../tasks/tasks.service'; // Import TasksService
    import { Task } from '../tasks/entities/task.entity'; // Import Task entity
    import { calendar_v3, google } from 'googleapis'; // Import google namespace
    // Import the shared interfaces from their dedicated file
    import { McpPayload, McpContext, McpCalendarEvent } from './interfaces/mcp.interfaces';

    @Injectable()
    export class ContextService {
      private readonly logger = new Logger(ContextService.name);
      // Stores the latest location received via the POST endpoint
      private latestLocation: LocationDto | null = null;

      // Inject CalendarService and TasksService via constructor
      constructor(
        private readonly calendarService: CalendarService,
        private readonly tasksService: TasksService, // Inject TasksService
        ) {}

      /**
       * Handles incoming location updates. Stores the latest location in memory.
       * @param locationDto - The location data received from the controller.
       */
      handleLocationUpdate(locationDto: LocationDto): void {
        this.logger.log(
          `ContextService received location update: Lat ${locationDto.latitude}, Lon ${locationDto.longitude}, Acc ${locationDto.accuracy || 'N/A'}`,
        );
        // Update the stored location
        this.latestLocation = locationDto;
      }

      /**
       * Retrieves the latest known location stored in memory.
       * @returns The latest LocationDto or null if none has been received yet.
       */
      getLatestLocation(): LocationDto | null {
        return this.latestLocation;
      }

      /**
       * Assembles a snapshot of the current context, including time, location,
       * calendar events, and tasks, formatted according to the MCP specification.
       * @returns A Promise resolving to the McpPayload object.
       */
      async buildContextSnapshot(): Promise<McpPayload> {
        this.logger.log('Building context snapshot...');
        const now = new Date();

        // --- Fetch Context Data Concurrently ---
        // Use Promise.allSettled to fetch async data (calendar, tasks) in parallel.
        // This is more efficient than fetching them sequentially.
        // It waits for all promises to settle (either resolve or reject).
        const [timeContextResult, locationContextResult, calendarContextResult, tasksResult] = await Promise.allSettled([
            // 1. Get Time Context (Synchronous operation wrapped in Promise.resolve)
            Promise.resolve({
                current_time: now.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin', hour12: false }),
                current_date: now.toLocaleDateString('en-IE', { timeZone: 'Europe/Dublin' }),
                timezone: 'Europe/Dublin', // Hardcoded Dublin timezone
            }),
            // 2. Get Location Context (Synchronous operation wrapped in Promise.resolve)
            Promise.resolve(this.latestLocation ? {
                latitude: this.latestLocation.latitude,
                longitude: this.latestLocation.longitude,
                accuracy: this.latestLocation.accuracy,
            } : null), // Return null if no location data available
            // 3. Get Calendar Context (Asynchronous call to CalendarService)
            this.calendarService.listUpcomingEvents(5) // Fetch up to 5 events
              .catch(error => {
                // Handle errors during calendar fetching gracefully
                if (error instanceof UnauthorizedException) {
                    this.logger.warn(`Could not fetch calendar events for context: Not authenticated.`);
                } else {
                    this.logger.error(`Error fetching calendar events for context: ${error.message}`, error.stack);
                }
                return null; // Return null to indicate calendar data is unavailable on error
            }),
             // 4. Get Tasks (Asynchronous call to TasksService)
             this.tasksService.findAll() // Fetch all tasks
               .catch(error => {
                // Handle errors during task fetching gracefully
                this.logger.error(`Error fetching tasks for context: ${error.message}`, error.stack);
                return []; // Return an empty array to indicate tasks are unavailable on error
             })
        ]);
        // --- End Concurrent Fetching ---


        // --- Process Settled Results ---

        // Process Calendar Results
        let finalCalendarContext: McpContext['calendar'] = null;
        // Check if the calendar promise was fulfilled and returned a value
        if (calendarContextResult.status === 'fulfilled' && calendarContextResult.value) {
            const eventsRaw = calendarContextResult.value;
            // Format the raw Google Calendar events into the McpCalendarEvent structure
            finalCalendarContext = {
                upcoming_events: eventsRaw.map((event: calendar_v3.Schema$Event): McpCalendarEvent => ({
                    start_time: event.start?.dateTime ?? event.start?.date ?? null,
                    end_time: event.end?.dateTime ?? event.end?.date ?? null,
                    summary: event.summary ?? null,
                    location: event.location ?? null,
                })),
            };
            this.logger.log(`Included ${finalCalendarContext.upcoming_events.length} calendar events.`);
        } else if (calendarContextResult.status === 'rejected' || !calendarContextResult.value) {
             // Log if fetching failed or returned null (already logged specific error in catch)
             this.logger.log('Calendar events could not be fetched or returned null.');
             // finalCalendarContext remains null
        }


        // Process Tasks Results
        let finalTasks: Task[] = [];
        // Check if the tasks promise was fulfilled
        if (tasksResult.status === 'fulfilled') {
            finalTasks = tasksResult.value; // Assign the fetched tasks
             this.logger.log(`Included ${finalTasks.length} tasks.`);
        } else {
            // Error was already logged in the catch block above
            this.logger.warn('Tasks could not be fetched.');
             // finalTasks remains an empty array
        }


        // Assemble the final MCP Payload using the processed results
        const mcpPayload: McpPayload = {
          user_id: 'user_placeholder_123', // Placeholder - replace with actual user ID later
          timestamp: now.toISOString(), // Current timestamp in ISO 8601 format
          context: {
            // Safely access values from settled promises, providing defaults if rejected
            time: timeContextResult.status === 'fulfilled' ? timeContextResult.value : { current_time: '', current_date: '', timezone: '' },
            location: locationContextResult.status === 'fulfilled' ? locationContextResult.value : null,
            calendar: finalCalendarContext, // Use the processed calendar context (can be null)
          },
          tasks: finalTasks, // Assign the fetched tasks (can be empty array)
        };

        this.logger.log('Context snapshot built successfully.');
        return mcpPayload;
      }
    }
    