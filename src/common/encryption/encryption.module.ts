// src/common/encryption/encryption.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule if EncryptionService uses it
import { EncryptionService } from './encryption.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule as EncryptionService depends on it
  providers: [EncryptionService],
  exports: [EncryptionService], // <-- Add this line to export the service
})
export class EncryptionModule {}
