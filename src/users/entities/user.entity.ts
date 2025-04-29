    // src/users/entities/user.entity.ts
    import { Task } from '../../tasks/entities/task.entity';
    import { OAuthToken } from '../../oauth-token/entities/oauth-token.entity'; // Import OAuthToken
    import {
      Entity,
      PrimaryGeneratedColumn,
      Column,
      CreateDateColumn,
      UpdateDateColumn,
      Index,
      OneToMany, // Ensure OneToMany is imported
    } from 'typeorm';

    @Entity('users')
    export class User {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column({ type: 'varchar', length: 255, unique: true })
      @Index()
      email: string;

      @Column({ type: 'varchar', length: 255 })
      passwordHash: string;

      // Optional fields
      // @Column({ type: 'varchar', length: 100, nullable: true })
      // firstName: string | null;
      // @Column({ type: 'varchar', length: 100, nullable: true })
      // lastName: string | null;

      // --- Relationships ---
      @OneToMany(() => Task, (task) => task.user)
      tasks: Task[];

      // ** Ensure this relationship to OAuthToken is defined **
      @OneToMany(() => OAuthToken, (token) => token.user) // Link to OAuth tokens
      oauthTokens: OAuthToken[]; // Defines the 'oauthTokens' property expected by OAuthToken entity's ManyToOne
      // --- End Relationships ---

      @CreateDateColumn({ type: 'timestamp with time zone' })
      createdAt: Date;

      @UpdateDateColumn({ type: 'timestamp with time zone' })
      updatedAt: Date;
    }
    