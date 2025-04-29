// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    this.logger.log(`Registration attempt for email: ${createUserDto.email}`);
    return this.usersService.create(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request) {
    const user = req.user as Pick<User, 'id' | 'email'>;
    this.logger.log(`Login successful for user: ${user.email}`);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request): Promise<Omit<User, 'passwordHash'>> {
    const userPayload = req.user as JwtPayload;
    this.logger.log(`Fetching profile for user ID: ${userPayload.sub}`);
    const user = await this.usersService.findOneById(userPayload.sub);
    if (!user) {
      throw new NotFoundException(`User with ID ${userPayload.sub} not found.`);
    }
    return user;
  }

  // --- Google OAuth Routes ---

  @Get('google/login')
  @UseGuards(JwtAuthGuard)
  googleLogin(@Req() req: Request, @Res() res: Response) {
    const user = req.user as JwtPayload;
    this.logger.log(`Initiating Google OAuth for user: ${user.sub}`);
    const state = Buffer.from(JSON.stringify({ userId: user.sub })).toString(
      'base64url',
    );
    try {
      const url = this.calendarService.generateAuthUrl(state);
      res.redirect(url);
    } catch (error) {
      this.logger.error(
        `Error during Google login redirect for user ${user.sub}: ${error.message}`,
        error.stack,
      );
      res
        .status(500)
        .send('Authentication initiation failed. Check server configuration.');
    }
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log(
      `Received callback from Google. Code: ${code ? '[PRESENT]' : 'N/A'}, Error: ${error || 'N/A'}, State: ${state ? '[PRESENT]' : 'N/A'}`,
    );

    let userId: string | null = null;
    if (!state) {
      this.logger.error('State parameter missing in Google callback.');
      res.status(400).send('Authentication failed: State parameter missing.');
      return;
    }
    try {
      const decodedState = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      );
      if (!decodedState || typeof decodedState.userId !== 'string') {
        this.logger.error('Invalid state content received in Google callback.');
        res.status(400).send('Authentication failed: State content invalid.');
        return;
      }
      userId = decodedState.userId;
      this.logger.log(`Extracted userId ${userId} from state parameter.`);
    } catch (stateError) {
      this.logger.error(
        `Error processing state parameter: ${stateError.message}`,
        stateError.stack,
      );
      res.status(400).send('Authentication failed: State processing failed.');
      return;
    }

    if (error) {
      this.logger.error(
        `Error returned from Google OAuth for user ${userId}: ${error}`,
      );
      res.status(401).send(`Authentication failed: ${error}`);
      return;
    }
    if (!code) {
      this.logger.error(
        `No authorization code received from Google for user ${userId}.`,
      );
      res
        .status(400)
        .send('Authentication failed: No authorization code received.');
      return;
    }

    // --- Add explicit check for userId before calling service ---
    if (userId === null) {
      // This case should technically not be reachable due to the checks above,
      // but it satisfies TypeScript and handles potential edge cases.
      this.logger.error('User ID was null before attempting token exchange.');
      res
        .status(500)
        .send('Internal server error: User context lost during callback.');
      return;
    }
    // --- End explicit check ---

    try {
      const tokens = await this.calendarService.getTokensFromCode(code, userId);
      this.logger.log(
        `Successfully obtained and saved tokens for user ${userId}.`,
      );
      res.redirect('/auth/success');
    } catch (err) {
      this.logger.error(
        `Error exchanging code for tokens for user ${userId}: ${err.message}`,
        err.stack,
      );
      res.status(500).send('Authentication failed during token exchange.');
    }
  }

  @Get('fetch-events')
  @UseGuards(JwtAuthGuard)
  async fetchEventsAfterAuth(@Req() req: Request, @Res() res: Response) {
    const user = req.user as JwtPayload;
    this.logger.log(
      `Manually fetching calendar events for user ${user.sub}...`,
    );
    try {
      const events = await this.calendarService.listUpcomingEvents(
        user.sub,
        15,
      );
      res
        .status(HttpStatus.OK)
        .send({ message: 'Fetched events successfully:', events: events });
    } catch (error) {
      this.logger.error(
        `Error in /fetch-events for user ${user.sub}: ${error.message}`,
        error.stack,
      );
      const status =
        error instanceof UnauthorizedException
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.INTERNAL_SERVER_ERROR;
      res
        .status(status)
        .send({ error: `Failed to fetch events: ${error.message}` });
    }
  }

  @Get('success')
  authSuccess() {
    return { message: 'Google Calendar authentication process completed!' };
  }
}
