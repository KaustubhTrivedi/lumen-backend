// src/calendar/calendar.service.ts
import { Injectable, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, Auth } from 'googleapis';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private oauth2Client: Auth.OAuth2Client;
  // IMPORTANT: Temporary in-memory storage for demo purposes ONLY.
  // In a real app, tokens MUST be stored securely (e.g., encrypted in DB)
  // and associated with a specific user.
  private tempTokens: Auth.Credentials | null = null;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Google OAuth credentials are not configured in .env file!');
      // In a real app, you might throw an error here to prevent startup
    } else {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );
      this.logger.log('Google OAuth2 Client Initialized');
    }
  }

  generateAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException('Google OAuth2 Client not initialized. Check configuration.');
    }
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
    });
    this.logger.log(`Generated Google Auth URL`); // Avoid logging the full URL potentially containing state
    return authorizationUrl;
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   * Stores the tokens (temporarily in memory for this example).
   * @param code - The authorization code received from Google redirect.
   * @returns The obtained tokens.
   * @throws Error if token exchange fails.
   */
  async getTokensFromCode(code: string): Promise<Auth.Credentials> {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
    }
    try {
      this.logger.log(`Attempting to exchange code for tokens...`);
      // Exchange the code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.logger.log('Successfully exchanged code for tokens.');

      // IMPORTANT: Store tokens securely associated with the user in a real app!
      // For now, just store them in memory and log (excluding sensitive parts if necessary)
      this.tempTokens = tokens;
      console.log('Received Tokens:', {
        access_token: tokens.access_token ? '[REDACTED]' : 'N/A', // Don't log access token
        refresh_token: tokens.refresh_token ? '[PRESENT]' : 'N/A', // Log presence, not value
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
      });


      // Set the credentials on the client instance for future API calls in this session
      this.oauth2Client.setCredentials(tokens);

      return tokens;
    } catch (error) {
      this.logger.error(`Failed to exchange authorization code: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Authentication failed: ${error.message}`);
    }
  }

  private getOAuthClient(): Auth.OAuth2Client {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException('Google OAuth2 Client not initialized. Check configuration.');
    }
    return this.oauth2Client;
  }

    // --- Methods to use the authenticated client will go here later ---
    /**
  * Fetches upcoming events from the primary calendar.
  * Assumes OAuth2 client has valid credentials set (from getTokensFromCode or stored tokens).
  * @param maxResults - Maximum number of events to fetch. Defaults to 10.
  * @returns A list of upcoming calendar events.
  * @throws UnauthorizedException if not authenticated.
  * @throws InternalServerErrorException on API errors.
  */
    async listUpcomingEvents(maxResults:number): Promise<Schema$Event[]> {
      this.logger.log(`Attempting to list upcoming events (max: ${maxResults})...`);
      // Ensure client is initialized and has credentials
      const client = this.getOAuthClient(); // This gets the client (and sets temp creds if available)
      if (!client.credentials || !client.credentials.access_token) {
        this.logger.warn('No valid credentials set on OAuth2 client for listing events.');
        // In a real app, you might try using a refresh token here if available and stored.
        throw new UnauthorizedException('Not authenticated with Google Calendar.');
      }

      // Create a Calendar API client instance using the authenticated OAuth client
      const calendar = google.calendar({ version: 'v3', auth: client });

      try {
        // Call the events.list method
        const response = await calendar.events.list({
          calendarId: 'primary', // Use 'primary' for the user's main calendar
          timeMin: new Date().toISOString(), // Start from the current time
          maxResults: maxResults, // Limit the number of results
          singleEvents: true, // Expand recurring events into single instances
          orderBy: 'startTime', // Order events by their start time
        });

        const events = response.data.items;
        if (events && events.length > 0) {
          this.logger.log(`Successfully fetched ${events.length} upcoming events.`);
          // Optional: Log event summaries for debugging
          // events.forEach(event => {
          //   const start = event.start?.dateTime || event.start?.date;
          //   console.log(`${start} - ${event.summary}`);
          // });
        } else {
          this.logger.log('No upcoming events found.');
        }
        return events || []; // Return the array of events or an empty array
      } catch (error) {
        this.logger.error(`Failed to fetch calendar events: ${error.message}`, error.stack);
        // Handle specific errors if needed (e.g., 403 Forbidden could mean insufficient scope)
        throw new InternalServerErrorException(`Failed to fetch calendar events: ${error.message}`);
      }
    }
}
