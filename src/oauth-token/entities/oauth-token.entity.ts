// src/oauth-token/entities/oauth-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OAuthProvider {
  GOOGLE_CALENDAR = 'google_calendar',
  // Add other providers here later if needed
}

@Entity('oauth_tokens')
export class OAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // In a multi-user app, this would be a relation to the User entity
  // @Column()
  // @Index()
  // userId: string;

  @Column({
    type: 'enum',
    enum: OAuthProvider,
    default: OAuthProvider.GOOGLE_CALENDAR, // Default or set based on service
  })
  @Index()
  provider: OAuthProvider;

  // Store the encrypted access token (encryption handled separately)
  @Column({ type: 'text' }) // Use 'text' for potentially long encrypted tokens
  accessToken: string; // Store encrypted

  // Store the encrypted refresh token (VERY important and sensitive)
  @Column({ type: 'text', nullable: true }) // Refresh token might not always be granted
  refreshToken: string | null; // Store encrypted

  @Column({ type: 'bigint', nullable: true }) // Store expiry timestamp (milliseconds)
  expiryDate: number | null;

  @Column({ type: 'text', nullable: true }) // Store granted scopes
  scope: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
