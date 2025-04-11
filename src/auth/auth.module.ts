// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CalendarModule } from '../calendar/calendar.module'; // Import CalendarModule

@Module({
  imports: [CalendarModule], // Add CalendarModule here
  controllers: [AuthController],
  // No providers needed here if AuthController uses CalendarService
})
export class AuthModule {}
