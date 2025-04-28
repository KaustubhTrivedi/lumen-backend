// src/oauth-token/oauth-token.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthToken } from './entities/oauth-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthToken])], // Register the entity
  providers: [], // No service needed for now, just the repository
  exports: [TypeOrmModule], // Export TypeOrmModule to make repository available
})
export class OAuthTokenModule {}
