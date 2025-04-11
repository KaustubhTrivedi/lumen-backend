    // src/auth/auth.controller.ts
    import { Controller, Get, Query, Res, InternalServerErrorException, Logger } from '@nestjs/common';
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
       * The frontend can call this to get the URL to redirect the user.
       * @returns JSON object containing the authorization URL: { url: string }
       */
      @Get('google/url')
      getGoogleAuthUrl() {
        try {
          // Call the service method to generate the URL
          const url = this.calendarService.generateAuthUrl();
          // Return the URL wrapped in a JSON object
          return { url: url };
        } catch (error) {
          // Log any errors during URL generation
          this.logger.error(`Error generating Google Auth URL: ${error.message}`, error.stack);
          // Throw a standard NestJS exception
          throw new InternalServerErrorException('Failed to generate Google Auth URL. Check server configuration.');
        }
      }

      /**
       * GET /auth/google/login
       * Endpoint to directly initiate the Google login flow by redirecting the user.
       * Useful for simple server-side redirects.
       * @param res - Express Response object for handling redirection.
       */
      @Get('google/login')
      googleLogin(@Res() res: Response) {
         try {
           // Generate the auth URL
           const url = this.calendarService.generateAuthUrl();
           // Redirect the user's browser to the Google consent screen
           res.redirect(url);
         } catch (error) {
           // Log any errors during redirect
           this.logger.error(`Error during Google login redirect: ${error.message}`, error.stack);
           // Send an error response back to the browser
           res.status(500).send('Authentication initiation failed. Check server configuration.');
         }
       }


      /**
       * GET /auth/google/callback
       * Handles the redirect back from Google after user provides consent (or denies).
       * This URI must exactly match one registered in Google Cloud Console.
       * @param code - The authorization code provided by Google if consent was granted.
       * @param error - An error string provided by Google if consent was denied or an error occurred.
       * @param res - Express Response object for handling redirection.
       */
      @Get('google/callback')
      async googleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
        // Log the incoming callback details (masking code if necessary in real production)
        this.logger.log(`Received callback from Google. Code: ${code ? '[PRESENT]' : 'N/A'}, Error: ${error || 'N/A'}`);

        // Check if Google returned an error parameter
        if (error) {
          this.logger.error(`Error returned from Google OAuth: ${error}`);
          // Respond with an unauthorized status and the error message
          res.status(401).send(`Authentication failed: ${error}`);
          return; // Stop execution
        }

        // Check if the authorization code is missing
        if (!code) {
          this.logger.error('No authorization code received from Google.');
          // Respond with a bad request status
          res.status(400).send('Authentication failed: No authorization code received.');
          return; // Stop execution
        }

        // If code is present and no error, proceed to exchange code for tokens
        try {
          // Call the service method to handle the token exchange
          const tokens = await this.calendarService.getTokensFromCode(code);
          this.logger.log('Successfully obtained tokens.');

          // --- Authentication Successful ---
          // TODO: Implement proper token storage and user association here.
          // 1. Get user context (e.g., from session or JWT if implementing user login).
          // 2. Securely store `tokens.access_token`, `tokens.refresh_token`, `tokens.expiry_date`
          //    in the database, associated with the user. Refresh token is crucial for long-term access.

          // For now, redirect to a simple success page/route
          // In a real app, redirect to the user's dashboard or original requested page.
          res.redirect('/auth/success'); // Example redirect (ensure this route exists or change target)

        } catch (err) {
          // Handle errors specifically from the token exchange process
          this.logger.error(`Error exchanging code for tokens: ${err.message}`, err.stack);
          // Respond with a server error status
          res.status(500).send('Authentication failed during token exchange.');
        }
      }

      /**
       * GET /auth/success
       * A simple example route to redirect to after successful authentication.
       * @returns A success message object.
       */
      @Get('success')
      authSuccess() {
        // In a real app, this might render a page or return user info
        return { message: "Google Calendar authentication successful!" };
      }
    }
    