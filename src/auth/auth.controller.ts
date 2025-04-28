    // src/auth/auth.controller.ts
    import { Controller, Get, Post, Body, Query, Res, Req, UseGuards, HttpCode, HttpStatus, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'; // Added Post, Req, UseGuards, HttpCode, HttpStatus
    import { CalendarService } from '../calendar/calendar.service';
    import { Response, Request } from 'express'; // Import Request
    import { McpPayload } from '../context/interfaces/mcp.interfaces'; // Assuming this path is correct
    import { AuthService } from './auth.service'; // Import AuthService
    import { UsersService } from '../users/users.service'; // Import UsersService for registration
    import { CreateUserDto } from '../users/dto/create-user.dto'; // Import CreateUserDto
    import { LocalAuthGuard } from './guards/local-auth.guard'; // Import LocalAuthGuard
    import { User } from '../users/entities/user.entity'; // Import User entity

    @Controller('auth')
    export class AuthController {
      private readonly logger = new Logger(AuthController.name);

      // Inject AuthService and UsersService
      constructor(
        private readonly calendarService: CalendarService, // Keep if needed for other routes
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
      ) {}

      /**
       * POST /auth/register
       * Endpoint for user registration.
       * @param createUserDto - Contains email and password.
       * @returns The newly created user object (without password hash).
       */
      @Post('register')
      @HttpCode(HttpStatus.CREATED) // Set status to 201 Created
      async register(@Body() createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
        // The ValidationPipe ensures createUserDto is valid
        this.logger.log(`Registration attempt for email: ${createUserDto.email}`);
        // Delegate user creation to UsersService (which handles hashing and saving)
        // UsersService will throw ConflictException if email exists
        return this.usersService.create(createUserDto);
      }

      /**
       * POST /auth/login
       * Endpoint for user login. Uses LocalAuthGuard to validate credentials.
       * @param req - The Express request object, populated with user by LocalAuthGuard.
       * @returns An object containing the JWT access token.
       */
      @UseGuards(LocalAuthGuard) // Apply the LocalAuthGuard to this route
      @Post('login')
      @HttpCode(HttpStatus.OK) // Set status to 200 OK
      async login(@Req() req: Request) {
        // If LocalAuthGuard passes, it attaches the validated user object to req.user
        // (based on what LocalStrategy.validate returns)
        this.logger.log(`Login successful for user: ${(req.user as any)?.email}`);
        // Call AuthService.login to generate the JWT for the validated user
        // We need to cast req.user as it's typed broadly by Express
        return this.authService.login(req.user as Pick<User, 'id' | 'email'>);
      }


      // --- Google OAuth Routes ---
      @Get('google/url')
      getGoogleAuthUrl() {
        // ... (previous code)
        try {
            const url = this.calendarService.generateAuthUrl();
            return { url: url };
          } catch (error) {
            this.logger.error(`Error generating Google Auth URL: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to generate Google Auth URL. Check server configuration.');
          }
      }

      @Get('google/login')
      googleLogin(@Res() res: Response) {
         // ... (previous code)
         try {
            const url = this.calendarService.generateAuthUrl();
            res.redirect(url);
          } catch (error) {
            this.logger.error(`Error during Google login redirect: ${error.message}`, error.stack);
            res.status(500).send('Authentication initiation failed. Check server configuration.');
          }
       }


      @Get('google/callback')
      async googleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
         // ... (previous code)
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
         try {
             const tokens = await this.calendarService.getTokensFromCode(code);
             this.logger.log('Successfully obtained tokens.');
             // TODO: Associate tokens with logged-in user
             res.redirect('/auth/fetch-events'); // Or wherever appropriate
         } catch (err) {
             this.logger.error(`Error exchanging code for tokens: ${err.message}`, err.stack);
             res.status(500).send('Authentication failed during token exchange.');
         }
      }

      // Example route (can be removed or adapted)
      @Get('fetch-events')
      async fetchEventsAfterAuth() {
         // ... (previous code)
         this.logger.log('Attempting to fetch calendar events after auth...');
         try {
             const events = await this.calendarService.listUpcomingEvents(15);
             return { message: "Google Calendar authentication successful! Fetched events:", events: events };
           } catch (error) {
              this.logger.error(`Error fetching events after auth: ${error.message}`, error.stack);
              return { error: `Failed to fetch events: ${error.message}` };
           }
      }

      // Example route (can be removed)
      @Get('success')
      authSuccess() {
        return { message: "Google Calendar authentication successful!" };
      }
    }
    