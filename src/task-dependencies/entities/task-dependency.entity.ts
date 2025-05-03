    // src/task-dependencies/entities/task-dependency.entity.ts
    import {
        Entity,
        PrimaryGeneratedColumn,
        Column,
        CreateDateColumn,
        UpdateDateColumn,
        Index,
        ManyToOne,
        JoinColumn,
      } from 'typeorm';
      import { User } from '../../users/entities/user.entity'; // Import User
      import { Task } from '../../tasks/entities/task.entity'; // Import Task
  
      @Entity('task_dependencies')
      // Add a unique constraint to prevent duplicate dependency entries for the same user
      @Index(['userId', 'blockingTaskId', 'dependentTaskId'], { unique: true })
      export class TaskDependency {
        @PrimaryGeneratedColumn('uuid')
        id: string;
  
        @Column({ type: 'uuid' })
        @Index()
        userId: string; // Which user does this dependency belong to?
  
        @Column({ type: 'uuid' })
        @Index()
        blockingTaskId: string; // The ID of the task that must be done first
  
        @Column({ type: 'uuid' })
        @Index()
        dependentTaskId: string; // The ID of the task that depends on the blocker
  
        // Optional: Add a strength/confidence score later
        // @Column({ type: 'float', default: 1.0 })
        // confidence: number;
  
        // --- Relationships (Define links for easier querying if needed) ---
        @ManyToOne(() => User, { onDelete: 'CASCADE' }) // Link to User
        @JoinColumn({ name: 'userId' })
        user: User;
  
        @ManyToOne(() => Task, { onDelete: 'CASCADE' }) // Link to the blocking Task
        @JoinColumn({ name: 'blockingTaskId' })
        blockingTask: Task;
  
        @ManyToOne(() => Task, { onDelete: 'CASCADE' }) // Link to the dependent Task
        @JoinColumn({ name: 'dependentTaskId' })
        dependentTask: Task;
        // --- End Relationships ---
  
        @CreateDateColumn({ type: 'timestamp with time zone' })
        createdAt: Date;
  
        @UpdateDateColumn({ type: 'timestamp with time zone' })
        updatedAt: Date;
      }
  
      