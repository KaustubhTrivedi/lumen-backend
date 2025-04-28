    // src/auth/strategies/jwt.strategy.ts
    import { ExtractJwt, Strategy } from 'passport-jwt';
    import { PassportStrategy } from '@nestjs/passport';
    import { Injectable, UnauthorizedException } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config'; // Import ConfigService
    // Import UsersService if you need to lookup user details based on JWT payload
    // import { UsersService } from '../../users/users.service';

    // Define the expected shape of the JWT payload after decoding
    export interface JwtPayload {
      email: string;
      sub: string; // Standard subject claim (usually user ID)
      // Add any other fields included during JWT signing (login method in AuthService)
    }

    @Injectable()
    export class JwtStrategy extends PassportStrategy(Strategy) { // Extend PassportStrategy with passport-jwt Strategy
      constructor(
        private configService: ConfigService, // Inject ConfigService to get JWT secret
        // private usersService: UsersService, // Inject UsersService if needed
      ) {
        super({
          // Configure how to extract the JWT from the request
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Standard: "Bearer <token>" in Authorization header
          // If true, Passport waits for token expiration Wcheck. Set to false to handle expiry in validate.
          ignoreExpiration: false,
          // Secret key used to verify the JWT signature
          secretOrKey: configService.get<string>('JWT_SECRET') || 'your-default-secret', // Get secret from config
        });
      }

      /**
       * Passport automatically calls this validate method after verifying the JWT signature and expiration.
       * It receives the decoded JWT payload.
       * @param payload - The decoded JWT payload (defined by JwtPayload interface).
       * @returns The object to be attached to request.user. Usually contains user identifier(s).
       * @throws UnauthorizedException if validation fails (e.g., user not found, token revoked - requires DB lookup).
       */
      async validate(payload: JwtPayload): Promise<Pick<JwtPayload, 'sub' | 'email'>> {
        // The JWT is already verified at this point.
        // The payload contains the data we put in it during the login method.

        // Optional: Database check to ensure user still exists or isn't revoked
        // const user = await this.usersService.findOneById(payload.sub);
        // if (!user) {
        //   throw new UnauthorizedException('User not found or token revoked');
        // }

        // Return the essential user identifiers from the payload.
        // This object will be attached to `request.user`.
        return { sub: payload.sub, email: payload.email };
      }
    }
    