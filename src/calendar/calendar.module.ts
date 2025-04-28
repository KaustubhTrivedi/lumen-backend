// src/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule
import { CalendarService } from './calendar.service';
// Remove the import of OAuthTokenModule if no longer needed for other reasons
// import { OAuthTokenModule } from '../oauth-token/oauth-token.module';
import { OAuthToken } from '../oauth-token/entities/oauth-token.entity'; // Import the entity

@Module({
  imports: [
    // Remove OAuthTokenModule from imports if it's only providing the repo
    // OAuthTokenModule,
    // Add TypeOrmModule.forFeature directly here
    TypeOrmModule.forFeature([OAuthToken]),
  ],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
