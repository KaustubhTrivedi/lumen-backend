// src/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
// Import ConfigModule if CalendarService depends on ConfigService directly
// import { ConfigModule } from '@nestjs/config';

@Module({
  // imports: [ConfigModule], // Only needed if CalendarService injects ConfigService
  providers: [CalendarService],
  exports: [CalendarService], // <-- Add this line to export the service
})
export class CalendarModule {}
