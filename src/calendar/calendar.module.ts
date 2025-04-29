// src/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { OAuthToken } from '../oauth-token/entities/oauth-token.entity';
import { EncryptionModule } from '../common/encryption/encryption.module'; // Import EncryptionModule

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthToken]),
    EncryptionModule, // Import EncryptionModule
  ],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
