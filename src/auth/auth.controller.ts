// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { Response } from 'express'; // Import Response from express

@Controller('auth') // Defines the base route for this controller as '/auth'
export class AuthController {
  // Initialize logger for this controller
  private readonly logger = new Logger(AuthController.name);

  // Inject CalendarService to access its methods
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * GET /auth/google/url
   * Endpoint to request the Google OAuth consent screen URL.
   * @returns JSON object containing the authorization URL: { url: string }
   */
  @Get('google/url')
  getGoogleAuthUrl() {
    try {
      const url = this.calendarService.generateAuthUrl();
      return { url: url };
    } catch (error) {
      this.logger.error(
        `Error generating Google Auth URL: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to generate Google Auth URL. Check server configuration.',
      );
    }
  }

  /**
   * GET /auth/google/login
   * Endpoint to directly initiate the Google login flow by redirecting the user.
   * @param res - Express Response object for handling redirection.
   */
  @Get('google/login')
  googleLogin(@Res() res: Response) {
    try {
      const url = this.calendarService.generateAuthUrl();
      res.redirect(url);
    } catch (error) {
      this.logger.error(
        `Error during Google login redirect: ${error.message}`,
        error.stack,
      );
      res
        .status(500)
        .send('Authentication initiation failed. Check server configuration.');
    }
  }

  /**
   * GET /auth/google/callback
   * Handles the redirect back from Google after user provides consent (or denies).
   * @param code - The authorization code provided by Google if consent was granted.
   * @param error - An error string provided by Google if consent was denied or an error occurred.
   * @param res - Express Response object for handling redirection.
   */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    this.logger.log(
      `Received callback from Google. Code: ${code ? '[PRESENT]' : 'N/A'}, Error: ${error || 'N/A'}`,
    );

    if (error) {
      this.logger.error(`Error returned from Google OAuth: ${error}`);
      res.status(401).send(`Authentication failed: ${error}`);
      return;
    }

    if (!code) {
      this.logger.error('No authorization code received from Google.');
      res
        .status(400)
        .send('Authentication failed: No authorization code received.');
      return;
    }

    try {
      const tokens = await this.calendarService.getTokensFromCode(code);
      this.logger.log('Successfully obtained tokens.');

      // --- Authentication Successful ---
      // TODO: Implement proper token storage and user association here.

      // *** UPDATED REDIRECT ***
      // Redirect to the route that fetches events
      res.redirect('/auth/fetch-events');
      // *************************
    } catch (err) {
      this.logger.error(
        `Error exchanging code for tokens: ${err.message}`,
        err.stack,
      );
      res.status(500).send('Authentication failed during token exchange.');
    }
  }

  /**
   * GET /auth/fetch-events
   * Endpoint called after successful auth to fetch calendar events.
   * @returns A success message and the list of fetched events.
   */
  @Get('fetch-events') // *** ADDED THIS ROUTE HANDLER ***
  async fetchEventsAfterAuth() {
    this.logger.log('Attempting to fetch calendar events after auth...');
    try {
      // Call the service method to list events
      const events = await this.calendarService.listUpcomingEvents(15); // Fetch up to 15 events
      // Return the fetched events as JSON
      return {
        message: 'Google Calendar authentication successful! Fetched events:',
        events: events,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching events after auth: ${error.message}`,
        error.stack,
      );
      // Return an error object - consider using HttpException for better status codes
      return { error: `Failed to fetch events: ${error.message}` };
    }
  }
  // *** END ADDED ROUTE HANDLER ***

  /**
   * GET /auth/success
   * A simple example route (can be removed if fetch-events is used).
   * @returns A success message object.
   */
  @Get('success')
  authSuccess() {
    // This route is likely no longer needed if callback redirects to fetch-events
    return { message: 'Google Calendar authentication successful!' };
  }
}
