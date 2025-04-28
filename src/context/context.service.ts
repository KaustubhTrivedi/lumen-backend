    // src/context/context.service.ts
    import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'; // Import necessary exceptions
    import { LocationDto } from './dto/location.dto';
    import { CalendarService } from '../calendar/calendar.service'; // Import CalendarService
    import { google } from 'googleapis'; // Import google namespace
    import { calendar_v3 } from 'googleapis'; // Import calendar_v3 type explicitly if needed elsewhere, or use google.calendar_v3
import { McpContext, McpPayload } from './interfaces/mcp.interfaces';

    @Injectable()
    export class ContextService {
      private readonly logger = new Logger(ContextService.name);
      private latestLocation: LocationDto | null = null;

      // Inject CalendarService
      constructor(private readonly calendarService: CalendarService) {}

      /**
       * Receives and stores (currently just logs and holds in memory) the latest location update.
       * @param locationDto - The location data received.
       */
      handleLocationUpdate(locationDto: LocationDto): void {
        this.logger.log(
          `ContextService received location update: Lat ${locationDto.latitude}, Lon ${locationDto.longitude}, Acc ${locationDto.accuracy || 'N/A'}`,
        );
        this.latestLocation = locationDto;
      }

      /**
       * Retrieves the latest known location.
       * @returns The latest LocationDto or null if none received yet.
       */
      getLatestLocation(): LocationDto | null {
        return this.latestLocation;
      }

      /**
       * Assembles a snapshot of the current context based on the MCP specification.
       * @returns The MCP payload object.
       */
      async buildContextSnapshot(): Promise<McpPayload> {
        this.logger.log('Building context snapshot...');
        const now = new Date();

        // 1. Get Time Context
        // Define options for formatting time and date according to Dublin timezone
        const timeOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Dublin', hour12: false };
        const dateOptions: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Dublin' }; // Use default date format for locale

        const timeContext = {
          // Format time and date using specific locale ('en-IE') and options
          current_time: now.toLocaleTimeString('en-IE', timeOptions),
          current_date: now.toLocaleDateString('en-IE', dateOptions),
          timezone: 'Europe/Dublin', // Hardcoded for now, ideally detect or get from user profile
        };

        // 2. Get Location Context
        const locationContext = this.latestLocation
          ? {
              latitude: this.latestLocation.latitude,
              longitude: this.latestLocation.longitude,
              accuracy: this.latestLocation.accuracy,
            }
          : null; // Set to null if no location data is available

        // 3. Get Calendar Context
        let calendarContext: McpContext['calendar'] = null; // Initialize as null
        try {
          // Fetch upcoming events from CalendarService
          // Ensure CalendarService is ready and authenticated
          const upcomingEventsRaw = await this.calendarService.listUpcomingEvents(5); // Fetch up to 5 events

          // Format events according to MCP spec if events are found
          if (upcomingEventsRaw) {
             calendarContext = {
               upcoming_events: upcomingEventsRaw.map((event: calendar_v3.Schema$Event) => ({
                 // Use nullish coalescing to handle potentially missing fields gracefully
                 start_time: event.start?.dateTime ?? event.start?.date ?? null, // Handle all-day vs timed events
                 end_time: event.end?.dateTime ?? event.end?.date ?? null,
                 summary: event.summary ?? null,
                 location: event.location ?? null,
               })),
             };
             this.logger.log(`Included ${calendarContext.upcoming_events.length} calendar events.`);
          } else {
             // Handle case where listUpcomingEvents returns null or undefined (though our impl returns [])
             this.logger.log('No upcoming events data returned from CalendarService.');
             calendarContext = { upcoming_events: [] }; // Set empty array if no events
          }

        } catch (error) {
           // Log specific errors, especially authentication issues
           if (error instanceof UnauthorizedException) {
              this.logger.warn(`Could not fetch calendar events for context: Not authenticated.`);
           } else {
              this.logger.error(`Error fetching calendar events for context: ${error.message}`, error.stack);
           }
           // Set calendar context to null on error to indicate data is unavailable
           calendarContext = null;
        }

        // 4. Assemble MCP Payload
        // TODO: Fetch actual tasks relevant to the context later
        const tasksPlaceholder: any[] = []; // Placeholder

        const mcpPayload: McpPayload = {
          user_id: 'user_placeholder_123', // Replace with actual user ID when auth is implemented
          timestamp: now.toISOString(), // ISO 8601 timestamp
          context: {
            time: timeContext,
            location: locationContext,
            calendar: calendarContext,
            // communication: null, // Placeholder for future context sources
            // learned_dependencies: null, // Placeholder for future context sources
          },
          tasks: tasksPlaceholder, // Include tasks array
        };

        this.logger.log('Context snapshot built successfully.');
        return mcpPayload;
      }
    }
    