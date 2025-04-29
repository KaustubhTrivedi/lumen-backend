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

          // Note: The 'tokens' event listener doesn't have user context easily,
          // so saving tokens triggered by automatic refresh needs careful handling
          // if user association is required at that point. We'll rely on explicit saves for now.
          // this.oauth2Client.on('tokens', (tokens) => { ... });
        }
      }

      generateAuthUrl(): string {
        // ... (previous code remains the same)
        // TODO: Consider adding user-specific state parameter here if needed later
        if (!this.oauth2Client) {
            throw new InternalServerErrorException('Google OAuth2 Client not initialized. Check configuration.');
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

      /**
       * Exchanges authorization code for tokens and saves them associated with a user.
       * @param code The authorization code from Google redirect.
       * @param userId The ID of the user who authorized the access.
       * @returns The obtained tokens (credentials).
       */
      // ** Accept userId **
      async getTokensFromCode(code: string, userId: string): Promise<Auth.Credentials> {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }
        try {
          this.logger.log(`Attempting to exchange code for tokens for user ${userId}...`);
          const { tokens } = await this.oauth2Client.getToken(code);
          this.logger.log(`Successfully exchanged code for tokens for user ${userId}.`);

          // ** Pass userId to save method **
          await this.saveOrUpdateTokens(userId, OAuthProvider.GOOGLE_CALENDAR, tokens);

          // Set credentials on the client instance for immediate use in this request context
          this.oauth2Client.setCredentials(tokens);
          return tokens;

        } catch (error) {
          this.logger.error(`Failed to exchange authorization code for user ${userId}: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Authentication failed: ${error.message}`);
        }
      }

      /**
       * Saves or updates OAuth tokens in the database for a specific user and provider.
       * @param userId The ID of the user owning the token.
       * @param provider The OAuth provider (e.g., GOOGLE_CALENDAR).
       * @param tokens The credentials object from Google (can be partial for updates).
       */
      // ** Accept userId **
      private async saveOrUpdateTokens(userId: string, provider: OAuthProvider, tokens: Partial<Auth.Credentials>): Promise<void> {
         this.logger.log(`Saving/updating tokens for user ${userId}, provider: ${provider}`);
         // **WARNING: Storing raw tokens is insecure. Implement encryption.**

         // Find existing token entry for this specific user and provider
         let existingToken = await this.tokenRepository.findOneBy({ userId, provider });

         if (existingToken) {
            // Update existing entry
            if (tokens.access_token) {
                 existingToken.accessToken = tokens.access_token; // Encrypt
            }
            if (tokens.refresh_token) {
                existingToken.refreshToken = tokens.refresh_token; // Encrypt
            }
            if (tokens.expiry_date !== undefined) { // Check explicitly for undefined, as 0 is valid
                existingToken.expiryDate = tokens.expiry_date;
            }
            if (tokens.scope) {
                existingToken.scope = tokens.scope;
            }
            await this.tokenRepository.save(existingToken);
            this.logger.log(`Updated existing tokens for user ${userId}, provider ${provider}`);
         } else {
            // Create new entry - requires essential fields
            if (!tokens.access_token) {
                 this.logger.error(`Attempted to save new token for user ${userId}, provider ${provider} without an access token.`);
                 return; // Cannot create without access token
            }
            const newToken = this.tokenRepository.create({
                userId: userId, // ** Save userId **
                provider: provider,
                accessToken: tokens.access_token, // Encrypt
                refreshToken: tokens.refresh_token ?? null, // Encrypt
                expiryDate: tokens.expiry_date ?? null,
                scope: tokens.scope ?? null,
            });
            await this.tokenRepository.save(newToken);
            this.logger.log(`Saved new tokens for user ${userId}, provider ${provider}`);
         }
      }

      /**
       * Retrieves tokens for a specific user from the database and sets them on the OAuth2 client.
       * Handles token refresh if necessary.
       * @param userId The ID of the user whose tokens are needed.
       * @returns The authenticated OAuth2Client instance.
       * @throws UnauthorizedException if no valid tokens are found or refresh fails.
       */
      // ** Accept userId **
      private async loadTokensAndGetClient(userId: string): Promise<Auth.OAuth2Client> {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }

        // Reset credentials before loading for a specific user to avoid using stale ones
        this.oauth2Client.setCredentials({});

        this.logger.log(`Attempting to load tokens from DB for user ${userId}, provider ${OAuthProvider.GOOGLE_CALENDAR}`);
        // ** Find token by userId and provider **
        const storedToken = await this.tokenRepository.findOneBy({ userId, provider: OAuthProvider.GOOGLE_CALENDAR });

        if (!storedToken) {
          this.logger.warn(`No stored tokens found for user ${userId}, provider ${OAuthProvider.GOOGLE_CALENDAR}`);
          throw new UnauthorizedException(`User ${userId} not authenticated with Google Calendar. No stored tokens.`);
        }

        // **IMPORTANT: Add decryption here in a real app!**
        const decryptedTokens: Auth.Credentials = {
          access_token: storedToken.accessToken, // Decrypt
          refresh_token: storedToken.refreshToken ?? undefined, // Decrypt
          expiry_date: storedToken.expiryDate,
          scope: storedToken.scope ?? undefined,
          token_type: 'Bearer',
        };

        // Set the stored credentials on the client
        this.oauth2Client.setCredentials(decryptedTokens);

        // Check if the access token is expired or missing
        const now = Date.now();
        const buffer = 60 * 1000; // 60-second buffer
        if (!decryptedTokens.access_token || (decryptedTokens.expiry_date && decryptedTokens.expiry_date < (now + buffer))) {
           this.logger.log(`Access token for user ${userId} is missing or expired. Attempting refresh...`);
           if (!decryptedTokens.refresh_token) {
              this.logger.error(`Access token for user ${userId} expired, but no refresh token available.`);
              // Optionally delete the invalid stored token
              // await this.tokenRepository.delete({ id: storedToken.id });
              throw new UnauthorizedException(`Authentication for user ${userId} expired, and no refresh token available. Please re-authenticate.`);
           }

           // Set only the refresh token for the refresh call
           this.oauth2Client.setCredentials({ refresh_token: decryptedTokens.refresh_token });

           try {
              // Use the refresh token to get a new access token
              const { credentials } = await this.oauth2Client.refreshAccessToken();
              this.logger.log(`Successfully refreshed access token for user ${userId}.`);

              const updatedTokensToSave = {
                 ...credentials, // Contains new access_token, expiry_date, scope etc.
                 refresh_token: decryptedTokens.refresh_token // Keep the original refresh token
              };

              // ** Pass userId to save method **
              await this.saveOrUpdateTokens(userId, OAuthProvider.GOOGLE_CALENDAR, updatedTokensToSave);

              // Set the complete new credentials on the client for use
              this.oauth2Client.setCredentials(updatedTokensToSave);
              this.logger.log(`Set refreshed credentials on OAuth client for user ${userId}.`);

           } catch (refreshError) {
              this.logger.error(`Failed to refresh access token for user ${userId}: ${refreshError.message}`, refreshError.response?.data);
              // Optionally delete the invalid stored token
              // await this.tokenRepository.delete({ id: storedToken.id });
              throw new UnauthorizedException(`Failed to refresh access token for user ${userId}. Please re-authenticate. Error: ${refreshError.message}`);
           }
        } else {
           this.logger.log(`Setting credentials on OAuth client from stored tokens for user ${userId}`);
        }

        return this.oauth2Client;
      }


      /**
       * Fetches upcoming events from the primary calendar for a specific user.
       * @param userId The ID of the user whose calendar events to fetch.
       * @param maxResults Maximum number of events to fetch.
       * @returns A list of upcoming calendar events.
       */
      // ** Accept userId **
      async listUpcomingEvents(userId: string, maxResults = 10): Promise<calendar_v3.Schema$Event[]> {
        this.logger.log(`Attempting to list upcoming events for user ${userId} (max: ${maxResults})...`);
        try {
          // Get the authenticated client for the specific user (will load/refresh tokens)
          const client = await this.loadTokensAndGetClient(userId); // ** Pass userId **

          const calendar = google.calendar({ version: 'v3', auth: client });
          const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
          });

          const events = response.data.items;
          this.logger.log(`Successfully fetched ${events?.length || 0} upcoming events for user ${userId}.`);
          return events || [];

        } catch (error) {
          // Catch specific errors from loadTokensAndGetClient or API call
          if (error instanceof UnauthorizedException) {
             this.logger.error(`Authentication error listing events for user ${userId}: ${error.message}`);
             throw error;
          }
          this.logger.error(`Failed to fetch calendar events for user ${userId}: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Failed to fetch calendar events: ${error.message}`);
        }
      }
    }
    