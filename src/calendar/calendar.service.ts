    // src/calendar/calendar.service.ts
    import { Injectable, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config';
    import { google, Auth, calendar_v3 } from 'googleapis';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { OAuthToken, OAuthProvider } from '../oauth-token/entities/oauth-token.entity';
    import { EncryptionService } from '../common/encryption/encryption.service'; // Import EncryptionService

    @Injectable()
    export class CalendarService {
      private readonly logger = new Logger(CalendarService.name);
      private oauth2Client: Auth.OAuth2Client;

      constructor(
        private configService: ConfigService,
        @InjectRepository(OAuthToken)
        private readonly tokenRepository: Repository<OAuthToken>,
        private readonly encryptionService: EncryptionService, // Inject EncryptionService
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
          // Removed the 'tokens' event listener for simplicity in saving encrypted tokens
        }
      }

      generateAuthUrl(state: string): string {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized. Check configuration.');
        }
        const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
        const authorizationUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          include_granted_scopes: true,
          prompt: 'consent',
          state: state, // ** Include the state parameter **
        });
        this.logger.log(`Generated Google Auth URL with state.`);
        return authorizationUrl;
      }

      

      async getTokensFromCode(code: string, userId: string): Promise<Auth.Credentials> {
        // ... (method remains the same, calls saveOrUpdateTokens below)
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }
        try {
          this.logger.log(`Attempting to exchange code for tokens for user ${userId}...`);
          const { tokens } = await this.oauth2Client.getToken(code);
          this.logger.log(`Successfully exchanged code for tokens for user ${userId}.`);

          await this.saveOrUpdateTokens(userId, OAuthProvider.GOOGLE_CALENDAR, tokens);

          this.oauth2Client.setCredentials(tokens);
          return tokens;

        } catch (error) {
          this.logger.error(`Failed to exchange authorization code for user ${userId}: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Authentication failed: ${error.message}`);
        }
      }

      // Updated to use EncryptionService
      private async saveOrUpdateTokens(userId: string, provider: OAuthProvider, tokens: Partial<Auth.Credentials>): Promise<void> {
         this.logger.log(`Encrypting and saving/updating tokens for user ${userId}, provider: ${provider}`);

         // ** Encrypt tokens before saving **
         const encryptedAccessToken = this.encryptionService.encrypt(tokens.access_token);
         // Encrypt refresh token only if it exists
         const encryptedRefreshToken = tokens.refresh_token
             ? this.encryptionService.encrypt(tokens.refresh_token)
             : undefined; // Keep undefined if not present in input

         let existingToken = await this.tokenRepository.findOneBy({ userId, provider });

         if (existingToken) {
            // Update existing entry
            if (encryptedAccessToken) { // Check if encryption succeeded (returned non-null)
                 existingToken.accessToken = encryptedAccessToken;
            }
            // Only update refresh token if a new encrypted one was generated
            if (encryptedRefreshToken) {
                existingToken.refreshToken = encryptedRefreshToken;
            }
            if (tokens.expiry_date !== undefined) {
                existingToken.expiryDate = tokens.expiry_date;
            }
            if (tokens.scope) {
                existingToken.scope = tokens.scope;
            }
            await this.tokenRepository.save(existingToken);
            this.logger.log(`Updated existing encrypted tokens for user ${userId}, provider ${provider}`);
         } else {
            // Create new entry
            if (!encryptedAccessToken) { // Check if encryption succeeded
                 this.logger.error(`Encryption failed or access token was null/undefined for new token: user ${userId}, provider ${provider}.`);
                 return; // Cannot create without a valid encrypted access token
            }
            const newToken = this.tokenRepository.create({
                userId: userId,
                provider: provider,
                accessToken: encryptedAccessToken,
                // Assign the encrypted refresh token (will be null if original was null/undefined or encryption failed)
                refreshToken: encryptedRefreshToken ?? null,
                expiryDate: tokens.expiry_date ?? null,
                scope: tokens.scope ?? null,
            });
            await this.tokenRepository.save(newToken);
            this.logger.log(`Saved new encrypted tokens for user ${userId}, provider ${provider}`);
         }
      }

      // Updated to use EncryptionService
      private async loadTokensAndGetClient(userId: string): Promise<Auth.OAuth2Client> {
        if (!this.oauth2Client) {
          throw new InternalServerErrorException('Google OAuth2 Client not initialized.');
        }

        this.oauth2Client.setCredentials({}); // Reset credentials before loading

        this.logger.log(`Loading and decrypting tokens from DB for user ${userId}, provider ${OAuthProvider.GOOGLE_CALENDAR}`);
        const storedToken = await this.tokenRepository.findOneBy({ userId, provider: OAuthProvider.GOOGLE_CALENDAR });

        if (!storedToken) {
          this.logger.warn(`No stored tokens found for user ${userId}, provider ${OAuthProvider.GOOGLE_CALENDAR}`);
          throw new UnauthorizedException(`User ${userId} not authenticated with Google Calendar. No stored tokens.`);
        }

        // ** Decrypt tokens after loading **
        const accessToken = this.encryptionService.decrypt(storedToken.accessToken);
        const refreshToken = this.encryptionService.decrypt(storedToken.refreshToken); // Will be null if original was null or decryption fails

        // Check if decryption failed (returned null)
        if (accessToken === null) {
             this.logger.error(`Failed to decrypt access token for user ${userId}. Stored token might be corrupted or key changed.`);
             // Optionally delete the corrupted token
             // await this.tokenRepository.delete({ id: storedToken.id });
             throw new InternalServerErrorException(`Failed to decrypt stored credentials for user ${userId}. Please re-authenticate.`);
        }
        // Note: Decryption failure of refresh token might be acceptable if access token is still valid

        const decryptedCredentials: Auth.Credentials = {
          access_token: accessToken,
          refresh_token: refreshToken ?? undefined, // Use undefined if null after decryption
          expiry_date: storedToken.expiryDate,
          scope: storedToken.scope ?? undefined,
          token_type: 'Bearer',
        };

        // Set the decrypted credentials on the client
        this.oauth2Client.setCredentials(decryptedCredentials);

        // Check if the access token is expired or missing (using decrypted token)
        const now = Date.now();
        const buffer = 60 * 1000; // 60-second buffer
        if (!decryptedCredentials.access_token || (decryptedCredentials.expiry_date && decryptedCredentials.expiry_date < (now + buffer))) {
           this.logger.log(`Access token for user ${userId} is missing or expired. Attempting refresh...`);
           if (!decryptedCredentials.refresh_token) {
              this.logger.error(`Access token for user ${userId} expired, but no refresh token available.`);
              throw new UnauthorizedException(`Authentication for user ${userId} expired, and no refresh token available. Please re-authenticate.`);
           }

           // Set only the refresh token for the refresh call
           this.oauth2Client.setCredentials({ refresh_token: decryptedCredentials.refresh_token });

           try {
              const { credentials: refreshedCredentials } = await this.oauth2Client.refreshAccessToken();
              this.logger.log(`Successfully refreshed access token for user ${userId}.`);

              // Merge new credentials with the existing refresh token for saving
              const updatedTokensToSave = {
                 ...refreshedCredentials,
                 refresh_token: decryptedCredentials.refresh_token
              };

              // Save the *newly encrypted* refreshed tokens
              await this.saveOrUpdateTokens(userId, OAuthProvider.GOOGLE_CALENDAR, updatedTokensToSave);

              // Set the complete new credentials on the client for use
              this.oauth2Client.setCredentials(updatedTokensToSave);
              this.logger.log(`Set refreshed credentials on OAuth client for user ${userId}.`);

           } catch (refreshError) {
              this.logger.error(`Failed to refresh access token for user ${userId}: ${refreshError.message}`, refreshError.response?.data);
              throw new UnauthorizedException(`Failed to refresh access token for user ${userId}. Please re-authenticate. Error: ${refreshError.message}`);
           }
        } else {
           this.logger.log(`Setting valid credentials on OAuth client from stored tokens for user ${userId}`);
        }

        return this.oauth2Client;
      }


      async listUpcomingEvents(userId: string, maxResults = 10): Promise<calendar_v3.Schema$Event[]> {
        // ... (method remains the same, calls the updated loadTokensAndGetClient)
        this.logger.log(`Attempting to list upcoming events for user ${userId} (max: ${maxResults})...`);
        try {
          const client = await this.loadTokensAndGetClient(userId);

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
          if (error instanceof UnauthorizedException) {
             this.logger.error(`Authentication error listing events for user ${userId}: ${error.message}`);
             throw error;
          }
          this.logger.error(`Failed to fetch calendar events for user ${userId}: ${error.message}`, error.stack);
          throw new InternalServerErrorException(`Failed to fetch calendar events: ${error.message}`);
        }
      }
    }
    