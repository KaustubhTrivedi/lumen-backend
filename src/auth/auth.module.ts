// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport'; // Import PassportModule
import { JwtModule } from '@nestjs/jwt'; // Import JwtModule
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule/Service
import { AuthController } from './auth.controller';
import { CalendarModule } from '../calendar/calendar.module';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { AuthService } from './auth.service'; // We will create this service soon
import { LocalStrategy } from './strategies/local.strategy'; // We will create this strategy soon
import { JwtStrategy } from './strategies/jwt.strategy'; // We will create this strategy soon

@Module({
  imports: [
    CalendarModule, // Keep if AuthController still uses CalendarService
    UsersModule, // Import UsersModule to access UsersService
    PassportModule, // Register PassportModule
    ConfigModule, // Ensure ConfigModule is available (likely already global)
    JwtModule.registerAsync({
      // Configure JwtModule asynchronously
      imports: [ConfigModule], // Import ConfigModule to use ConfigService
      inject: [ConfigService], // Inject ConfigService
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Get secret from .env
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME', '3600s'), // Get expiration from .env or default
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // We will add AuthService and Strategies to providers later
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService], // Export AuthService if needed elsewhere
})
export class AuthModule {}
