    // src/calendar/calendar.service.ts
    import { Injectable, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config';
    import { google, Auth, calendar_v3 } from 'googleapis';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { OAuthToken, OAuthProvider } from '../oauth-token/entities/oauth-token.entity';

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
          this.logger.error('Google OAuth credentials are not configured in .env file!');
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
          this.logger.log(`Generated Google Auth URL`);
          return authorizationUrl;
      }

      async getTokensFromCode(code: string): Promise<Auth.Credentials> {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }
        try {
          this.logger.log(`Attempting to exchange code for tokens...`);
          const { tokens } = await this.oauth2Client.getToken(code);
          this.logger.log('Successfully exchanged code for tokens.');

          await this.saveOrUpdateTokens(OAuthProvider.GOOGLE_CALENDAR, tokens);

          this.oauth2Client.setCredentials(tokens);
          return tokens;

        } catch (error) {
          this.logger.error(`Failed to exchange authorization code: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Authentication failed: ${error.message}`);
        }
      }

      private async saveOrUpdateTokens(provider: OAuthProvider, tokens: Auth.Credentials): Promise<void> {
         this.logger.log(`Saving/updating tokens for provider: ${provider}`);
         // **WARNING: Storing raw tokens is insecure. Implement encryption.**
         // Use nullish coalescing (??) or default values to handle potential null/undefined
         const encryptedAccessToken = tokens.access_token ?? ''; // Provide default empty string if null/undefined
         const encryptedRefreshToken = tokens.refresh_token; // Keep as potentially null

         let existingToken = await this.tokenRepository.findOneBy({ provider });

         if (existingToken) {
            // Update existing entry
            // Ensure accessToken is always a string
            existingToken.accessToken = encryptedAccessToken || existingToken.accessToken; // Keep old if new is empty/null
            if (encryptedRefreshToken) {
                existingToken.refreshToken = encryptedRefreshToken;
            }
            // Handle potential null/undefined for expiryDate and scope
            existingToken.expiryDate = tokens.expiry_date ?? null; // Assign null if undefined
            existingToken.scope = tokens.scope ?? null; // Assign null if undefined
            await this.tokenRepository.save(existingToken);
            this.logger.log(`Updated existing tokens for ${provider}`);
         } else {
            // Create new entry
            // Ensure required fields have valid defaults if needed
            const newToken = this.tokenRepository.create({
                provider: provider,
                accessToken: encryptedAccessToken, // Will be '' if null/undefined from tokens
                refreshToken: encryptedRefreshToken ?? null, // Ensure it's null if undefined
                expiryDate: tokens.expiry_date ?? null, // Ensure it's null if undefined
                scope: tokens.scope ?? null, // Ensure it's null if undefined
                // userId: 'some_user_id' // Add when user auth is implemented
            });
             // Check if accessToken is valid before saving (optional, depends on entity constraints)
             if (!newToken.accessToken) {
                this.logger.error(`Attempted to save token for ${provider} without a valid access token.`);
                // Decide how to handle this - throw error? Log and skip?
                // For now, we'll log and potentially let save fail if DB constraint exists
             }
            await this.tokenRepository.save(newToken);
            this.logger.log(`Saved new tokens for ${provider}`);
         }
      }


      private async loadTokensAndGetClient(): Promise<Auth.OAuth2Client> {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }

        if (this.oauth2Client.credentials && this.oauth2Client.credentials.access_token) {
              this.logger.log('Using already set credentials on OAuth client.');
              return this.oauth2Client;
        }

        this.logger.log(`Attempting to load tokens from DB for ${OAuthProvider.GOOGLE_CALENDAR}`);
        const storedToken = await this.tokenRepository.findOneBy({ provider: OAuthProvider.GOOGLE_CALENDAR });

        if (!storedToken || !storedToken.accessToken) {
          this.logger.warn(`No valid stored tokens found for ${OAuthProvider.GOOGLE_CALENDAR}`);
          throw new UnauthorizedException('Not authenticated with Google Calendar. No stored tokens.');
        }

        // **IMPORTANT: Add decryption here in a real app!**
        const decryptedTokens: Auth.Credentials = {
          access_token: storedToken.accessToken, // Replace with decryption call
          refresh_token: storedToken.refreshToken ?? undefined, // Assign undefined if null from DB
          expiry_date: storedToken.expiryDate,
          // Handle potential null from DB for scope, assign undefined if null
          scope: storedToken.scope ?? undefined,
          token_type: 'Bearer',
        };

        // TODO: Implement refresh token logic here

        this.logger.log(`Setting credentials on OAuth client from stored tokens for ${OAuthProvider.GOOGLE_CALENDAR}`);
        this.oauth2Client.setCredentials(decryptedTokens);
        return this.oauth2Client;
      }


      async listUpcomingEvents(maxResults = 10): Promise<calendar_v3.Schema$Event[]> {
        this.logger.log(`Attempting to list upcoming events (max: ${maxResults})...`);
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
          this.logger.log(`Successfully fetched ${events?.length || 0} upcoming events.`);
          return events || [];

        } catch (error) {
          if (error instanceof UnauthorizedException) {
             this.logger.error(`Authentication error listing events: ${error.message}`);
             throw error;
          }
          this.logger.error(`Failed to fetch calendar events: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Failed to fetch calendar events: ${error.message}`);
        }
      }
    }
    