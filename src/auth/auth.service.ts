// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service'; // Import UsersService
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import * as bcrypt from 'bcryptjs'; // Use bcryptjs as installed
import { User } from '../users/entities/user.entity'; // Import User entity

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, // Inject UsersService
    private jwtService: JwtService, // Inject JwtService
  ) {}

  /**
   * Validates a user based on email and password.
   * Called by the LocalStrategy during login attempts.
   * @param email - User's email.
   * @param pass - Plain text password provided by user.
   * @returns The user object (without password hash) if valid, otherwise null.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    // Find user by email, including the password hash
    const user = await this.usersService.findOneByEmail(email);

    // Check if user exists and if the provided password matches the stored hash
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // If valid, remove password hash before returning user object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result; // Return user object without the hash
    }
    return null; // Return null if validation fails
  }

  /**
   * Generates a JWT access token for a validated user.
   * Called after successful validation via LocalStrategy/login endpoint.
   * @param user - The validated user object (must contain at least 'id' and 'email').
   * @returns An object containing the JWT access token.
   */
  async login(user: Pick<User, 'id' | 'email'>) {
    // The payload included in the JWT. Keep it minimal.
    // 'sub' (subject) is standard for user ID.
    const payload = { email: user.email, sub: user.id };

    // Sign the payload using the secret and expiration from JwtModule config
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  // We might add a register method here later that calls usersService.create
  // Or keep registration logic separate in UsersController/Service
}
