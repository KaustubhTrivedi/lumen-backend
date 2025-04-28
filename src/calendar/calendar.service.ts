// src/calendar/calendar.service.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, Auth, calendar_v3 } from 'googleapis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OAuthToken,
  OAuthProvider,
} from '../oauth-token/entities/oauth-token.entity';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private oauth2Client: Auth.OAuth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(OAuthToken)
    private readonly tokenRepository: Repository<OAuthToken>,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error(
        'Google OAuth credentials are not configured in .env file!',
      );
    } else {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );
      this.logger.log('Google OAuth2 Client Initialized');

      this.oauth2Client.on('tokens', (tokens) => {
        this.logger.log('OAuth2Client emitted "tokens" event.');
        if (tokens.refresh_token) {
          this.logger.log('Received refresh_token within "tokens" event.');
          this.saveOrUpdateTokens(OAuthProvider.GOOGLE_CALENDAR, tokens);
        } else {
          this.logger.log(
            'Access token refreshed via "tokens" event (no new refresh_token).',
          );
        }
      });
    }
  }

  generateAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException(
        'Google OAuth2 Client not initialized. Check configuration.',
      );
    }
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent',
    });
    this.logger.log(`Generated Google Auth URL`);
    return authorizationUrl;
  }

  async getTokensFromCode(code: string): Promise<Auth.Credentials> {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException(
        'Google OAuth2 Client not initialized.',
      );
    }
    try {
      this.logger.log(`Attempting to exchange code for tokens...`);
      const { tokens } = await this.oauth2Client.getToken(code);
      this.logger.log('Successfully exchanged code for tokens.');

      await this.saveOrUpdateTokens(OAuthProvider.GOOGLE_CALENDAR, tokens);

      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      this.logger.error(
        `Failed to exchange authorization code: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Authentication failed: ${error.message}`,
      );
    }
  }

  private async saveOrUpdateTokens(
    provider: OAuthProvider,
    tokens: Partial<Auth.Credentials>,
  ): Promise<void> {
    this.logger.log(`Saving/updating tokens for provider: ${provider}`);

    let existingToken = await this.tokenRepository.findOneBy({ provider });

    if (existingToken) {
      if (tokens.access_token) {
        existingToken.accessToken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        existingToken.refreshToken = tokens.refresh_token;
      }
      if (tokens.expiry_date) {
        existingToken.expiryDate = tokens.expiry_date;
      }
      if (tokens.scope) {
        existingToken.scope = tokens.scope;
      }
      await this.tokenRepository.save(existingToken);
      this.logger.log(`Updated existing tokens for ${provider}`);
    } else {
      if (!tokens.access_token) {
        this.logger.error(
          `Attempted to save new token for ${provider} without an access token.`,
        );
        return;
      }
      const newToken = this.tokenRepository.create({
        provider: provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiryDate: tokens.expiry_date ?? null,
        scope: tokens.scope ?? null,
      });
      await this.tokenRepository.save(newToken);
      this.logger.log(`Saved new tokens for ${provider}`);
    }
  }

  private async loadTokensAndGetClient(): Promise<Auth.OAuth2Client> {
    if (!this.oauth2Client) {
      throw new InternalServerErrorException(
        'Google OAuth2 Client not initialized.',
      );
    }

    if (
      this.oauth2Client.credentials &&
      this.oauth2Client.credentials.access_token &&
      (!this.oauth2Client.credentials.expiry_date ||
        this.oauth2Client.credentials.expiry_date > Date.now())
    ) {
      this.logger.log(
        'Using already set and valid credentials on OAuth client.',
      );
      return this.oauth2Client;
    }

    this.logger.log(
      `Attempting to load tokens from DB for ${OAuthProvider.GOOGLE_CALENDAR}`,
    );
    const storedToken = await this.tokenRepository.findOneBy({
      provider: OAuthProvider.GOOGLE_CALENDAR,
    });

    if (!storedToken) {
      this.logger.warn(
        `No stored tokens found for ${OAuthProvider.GOOGLE_CALENDAR}`,
      );
      throw new UnauthorizedException(
        'Not authenticated with Google Calendar. No stored tokens.',
      );
    }

    const decryptedTokens: Auth.Credentials = {
      access_token: storedToken.accessToken,
      refresh_token: storedToken.refreshToken ?? undefined,
      expiry_date: storedToken.expiryDate,
      scope: storedToken.scope ?? undefined,
      token_type: 'Bearer',
    };

    this.oauth2Client.setCredentials(decryptedTokens);

    const now = Date.now();
    const buffer = 60 * 1000;
    if (
      !decryptedTokens.access_token ||
      (decryptedTokens.expiry_date &&
        decryptedTokens.expiry_date < now + buffer)
    ) {
      this.logger.log(
        'Access token is missing or expired. Attempting refresh...',
      );
      if (!decryptedTokens.refresh_token) {
        this.logger.error(
          'Access token expired, but no refresh token available in storage.',
        );
        throw new UnauthorizedException(
          'Authentication expired, and no refresh token available. Please re-authenticate.',
        );
      }

      this.oauth2Client.setCredentials({
        refresh_token: decryptedTokens.refresh_token,
      });

      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.logger.log('Successfully refreshed access token.');

        const updatedTokensToSave = {
          ...credentials,
          refresh_token: decryptedTokens.refresh_token,
        };

        await this.saveOrUpdateTokens(
          OAuthProvider.GOOGLE_CALENDAR,
          updatedTokensToSave,
        );

        this.oauth2Client.setCredentials(updatedTokensToSave);
        this.logger.log('Set refreshed credentials on OAuth client.');
      } catch (refreshError) {
        this.logger.error(
          `Failed to refresh access token: ${refreshError.message}`,
          refreshError.response?.data,
        );
        throw new UnauthorizedException(
          `Failed to refresh access token. Please re-authenticate. Error: ${refreshError.message}`,
        );
      }
    } else {
      this.logger.log(
        `Setting credentials on OAuth client from stored tokens for ${OAuthProvider.GOOGLE_CALENDAR}`,
      );
    }

    return this.oauth2Client;
  }

  async listUpcomingEvents(
    maxResults = 10,
  ): Promise<calendar_v3.Schema$Event[]> {
    this.logger.log(
      `Attempting to list upcoming events (max: ${maxResults})...`,
    );
    try {
      const client = await this.loadTokensAndGetClient();

      const calendar = google.calendar({ version: 'v3', auth: client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items;
      this.logger.log(
        `Successfully fetched ${events?.length || 0} upcoming events.`,
      );
      return events || [];
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error(
          `Authentication error listing events: ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `Failed to fetch calendar events: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch calendar events: ${error.message}`,
      );
    }
  }
}
