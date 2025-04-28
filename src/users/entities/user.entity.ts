// src/users/entities/user.entity.ts
import { Task } from '../../tasks/entities/task.entity'; // Import Task if setting up relation
import { OAuthToken } from '../../oauth-token/entities/oauth-token.entity'; // Import OAuthToken if setting up relation
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany, // Import if setting up relations
} from 'typeorm';

@Entity('users') // Database table name will be 'users'
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true }) // Emails must be unique
  @Index() // Index email for faster lookups
  email: string;

  @Column({ type: 'varchar', length: 255 }) // Store the hashed password
  passwordHash: string; // Never store plain text passwords!

  // Optional: Add other user fields like name, preferences etc.
  // @Column({ type: 'varchar', length: 100, nullable: true })
  // firstName: string | null;
  // @Column({ type: 'varchar', length: 100, nullable: true })
  // lastName: string | null;

  // --- Relationships (Optional but recommended for linking data) ---
  // Uncomment these when you want to link tasks and tokens to users

  // @OneToMany(() => Task, (task) => task.user) // Link to tasks
  // tasks: Task[];

  // @OneToMany(() => OAuthToken, (token) => token.user) // Link to OAuth tokens
  // oauthTokens: OAuthToken[];
  // --- End Relationships ---

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
