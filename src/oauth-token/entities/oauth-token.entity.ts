// src/oauth-token/entities/oauth-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne, // Import ManyToOne
  JoinColumn, // Import JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Import User entity

export enum OAuthProvider {
  GOOGLE_CALENDAR = 'google_calendar',
  // Add other providers here later if needed
}

@Entity('oauth_tokens')
export class OAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Add User Relationship ---
  @Column({ type: 'uuid' }) // Column to store the User'  s ID (foreign key)
  @Index() // Index the foreign key for faster lookupsAA
  userId: string;

  // Define the relationship to the User entity
  @ManyToOne(() => User, (user) => user.oauthTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // Specify the foreign key column name
  user: User; // Property to access the related User object (optional loading)
  // --- End User Relationship ---

  @Column({
    type: 'enum',
    enum: OAuthProvider,
    // Consider removing default if provider is always set explicitly
    // default: OAuthProvider.GOOGLE_CALENDAR,
  })
  @Index() // Index provider for faster lookups per provider/user
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
