    // src/users/entities/user.entity.ts
    import { Task } from '../../tasks/entities/task.entity'; // Import Task
    import { OAuthToken } from '../../oauth-token/entities/oauth-token.entity';
    import {
      Entity,
      PrimaryGeneratedColumn,
      Column,
      CreateDateColumn,
      UpdateDateColumn,
      Index,
      OneToMany, // Import OneToMany decorator
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
      // ** Uncommented and defined the OneToMany relationship to Task **
      @OneToMany(() => Task, (task) => task.user) // Link to tasks
      tasks: Task[]; // Defines the 'tasks' property expected by Task entity's ManyToOne

      // Keep this commented out for now unless you are ready to link tokens
      // @OneToMany(() => OAuthToken, (token) => token.user) // Link to OAuth tokens
      // oauthTokens: OAuthToken[];
      // --- End Relationships ---

      @CreateDateColumn({ type: 'timestamp with time zone' })
      createdAt: Date;

      @UpdateDateColumn({ type: 'timestamp with time zone' })
      updatedAt: Date;
    }
    