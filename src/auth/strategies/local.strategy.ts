// src/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service'; // Import AuthService
import { User } from '../../users/entities/user.entity'; // Import User entity

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  // Extend PassportStrategy with passport-local Strategy
  constructor(private authService: AuthService) {
    // Configure passport-local strategy options
    super({
      usernameField: 'email', // Tell Passport to use 'email' field from request body as username
      // passwordField: 'password' // 'password' is the default, no need to specify
    });
  }

  /**
   * Passport automatically calls this validate method when LocalAuthGuard is used.
   * It receives the credentials extracted based on the options above (email, password).
   * @param email - The email extracted from the request body.
   * @param password - The password extracted from the request body.
   * @returns The validated user object (without password hash).
   * @throws UnauthorizedException if validation fails.
   */
  async validate(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    // Call the AuthService method to validate the user credentials
    const user = await this.authService.validateUser(email, password);
    // If validateUser returns null, throw an exception
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // If validation is successful, Passport attaches the returned user object
    // to the request (e.g., request.user)
    return user;
  }
}
