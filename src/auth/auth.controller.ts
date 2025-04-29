    // src/auth/auth.controller.ts
    import { Controller, Get, Post, Body, Query, Res, Req, UseGuards, HttpCode, HttpStatus, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
    import { CalendarService } from '../calendar/calendar.service';
    import { Response, Request } from 'express'; // Import Request & Response types
    import { AuthService } from './auth.service'; // Import AuthService
    import { UsersService } from '../users/users.service'; // Import UsersService for registration
    import { CreateUserDto } from '../users/dto/create-user.dto'; // Import CreateUserDto
    import { LocalAuthGuard } from './guards/local-auth.guard'; // Import LocalAuthGuard for login
    import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Import JwtAuthGuard for protected routes
    import { User } from '../users/entities/user.entity'; // Import User entity for type hints
    import { JwtPayload } from './strategies/jwt.strategy'; // Import JwtPayload type

    @Controller('auth') // Base route for all endpoints in this controller
    export class AuthController {
      private readonly logger = new Logger(AuthController.name);

      // Inject necessary services
      constructor(
        private readonly calendarService: CalendarService,
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
      ) {}

      /**
       * POST /auth/register
       * Endpoint for user registration.
       * @param createUserDto - Contains email and password, validated by global pipe.
       * @returns The newly created user object (without password hash).
       * @throws ConflictException if email already exists (handled by UsersService).
       */
      @Post('register')
      @HttpCode(HttpStatus.CREATED) // Set default success status to 201 Created
      async register(@Body() createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
        this.logger.log(`Registration attempt for email: ${createUserDto.email}`);
        // Delegate user creation (including password hashing) to UsersService
        return this.usersService.create(createUserDto);
      }

      /**
       * POST /auth/login
       * Endpoint for user login using email and password.
       * Uses LocalAuthGuard to trigger validation via LocalStrategy -> AuthService.validateUser.
       * @param req - The Express request object, populated with the validated user by LocalAuthGuard.
       * @returns An object containing the JWT access token: { access_token: string }.
       */
      @UseGuards(LocalAuthGuard) // Apply the LocalAuthGuard to this route
      @Post('login')
      @HttpCode(HttpStatus.OK) // Set default success status to 200 OK
      async login(@Req() req: Request) {
        // If LocalAuthGuard passes, req.user contains the user object returned by LocalStrategy.validate
        const user = req.user as Pick<User, 'id' | 'email'>; // Cast for clarity
        this.logger.log(`Login successful for user: ${user.email}`);
        // Call AuthService.login to generate the JWT for the validated user
        return this.authService.login(user);
      }


      // --- Google OAuth Routes ---

      /**
       * GET /auth/google/login
       * Initiates the Google OAuth flow by redirecting the user to Google's consent screen.
       * Note: Consider protecting this with JwtAuthGuard and passing userId via state for better security.
       * @param res - Express Response object for handling the redirect.
       */
      @Get('google/login')
      googleLogin(@Res() res: Response) {
         try {
           const url = this.calendarService.generateAuthUrl();
           res.redirect(url);
         } catch (error) {
           this.logger.error(`Error during Google login redirect: ${error.message}`, error.stack);
           res.status(500).send('Authentication initiation failed. Check server configuration.');
         }
       }


      /**
       * GET /auth/google/callback
       * Handles the redirect from Google after user consent. Exchanges code for tokens.
       * Associates tokens with a user (currently using a temporary hardcoded ID).
       * @param code - The authorization code from Google.
       * @param error - Potential error string from Google.
       * @param res - Express Response object for handling redirection.
       */
      @Get('google/callback')
      async googleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
        this.logger.log(`Received callback from Google. Code: ${code ? '[PRESENT]' : 'N/A'}, Error: ${error || 'N/A'}`);

        if (error) {
          this.logger.error(`Error returned from Google OAuth: ${error}`);
          res.status(401).send(`Authentication failed: ${error}`);
          return;
        }
        if (!code) {
          this.logger.error('No authorization code received from Google.');
          res.status(400).send('Authentication failed: No authorization code received.');
          return;
        }

        // --- TEMPORARY FIX: Hardcode User ID ---
        // Replace 'YOUR_TEST_USER_ID_HERE' with an actual UUID from your users table.
        // This needs a proper solution (e.g., using state parameter or session).
        const tempUserId = '67dbf820-9f11-4c7e-b9f3-26dcdad92348';
        // --- END TEMPORARY FIX ---

        try {
          // Pass the code and the (hardcoded) userId to exchange for tokens and save them
          const tokens = await this.calendarService.getTokensFromCode(code, tempUserId);
          this.logger.log(`Successfully obtained and saved tokens for user ${tempUserId}.`);

          // Redirect to a simple success page/route
          res.redirect('/auth/success');

        } catch (err) {
          this.logger.error(`Error exchanging code for tokens: ${err.message}`, err.stack);
          res.status(500).send('Authentication failed during token exchange.');
        }
      }

      /**
       * GET /auth/fetch-events
       * Example protected route to test fetching calendar events after authentication.
       * Requires a valid JWT.
       * @param req - The Express request object, populated with JWT payload by JwtAuthGuard.
       * @returns An object containing a success message and the fetched events.
       */
      @Get('fetch-events')
      @UseGuards(JwtAuthGuard) // Protect this route
      async fetchEventsAfterAuth(@Req() req: Request, @Res() res: Response) { // Inject Res for error handling
         const user = req.user as JwtPayload; // Extract user payload (contains sub: userId, email)
         this.logger.log(`Manually fetching calendar events for user ${user.sub}...`);
         try {
             // Pass the authenticated user's ID to listUpcomingEvents
             const events = await this.calendarService.listUpcomingEvents(user.sub, 15); // Pass user.sub
             // Return success response with events
             res.status(HttpStatus.OK).send({ message: "Fetched events successfully:", events: events });
           } catch (error) {
              this.logger.error(`Error in /fetch-events for user ${user.sub}: ${error.message}`, error.stack);
              // Send appropriate error status code and message
              const status = error instanceof UnauthorizedException ? HttpStatus.UNAUTHORIZED : HttpStatus.INTERNAL_SERVER_ERROR;
              res.status(status).send({ error: `Failed to fetch events: ${error.message}` });
           }
      }

      /**
       * GET /auth/success
       * A simple example route to redirect to after successful Google authentication.
       * @returns A success message object.
       */
      @Get('success')
      authSuccess() {
        return { message: "Google Calendar authentication process completed!" };
      }

      // Optional: Remove getGoogleAuthUrl if only using googleLogin for redirect
      // @Get('google/url')
      // getGoogleAuthUrl() { ... }
    }
    