    // src/tasks/entities/task.entity.ts
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
    import { User } from '../../users/entities/user.entity';

    // Define an enum for importance levels
    export enum TaskImportance {
        LOW = 'low',
        MEDIUM = 'medium',
        HIGH = 'high',
    }

    @Entity('tasks')
    export class Task {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column({ type: 'varchar', length: 255 })
      title: string;

      @Column({ type: 'text', nullable: true })
      description: string | null;

      @Index()
      @Column({ type: 'timestamp with time zone', nullable: true })
      dueDate: Date | null;

      @Column({ type: 'boolean', default: false })
      isComplete: boolean;

      // ** Add Importance Field **
      @Column({
          type: 'enum',
          enum: TaskImportance,
          default: TaskImportance.MEDIUM, // Set a default importance
      })
      importance: TaskImportance;
      // ** End Importance Field **

      // --- User Relationship ---
      @Column({ type: 'uuid' })
      @Index()
      userId: string;

      @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
      @JoinColumn({ name: 'userId' })
      user: User;
      // --- End User Relationship ---

      @CreateDateColumn({ type: 'timestamp with time zone' })
      createdAt: Date;

      @UpdateDateColumn({ type: 'timestamp with time zone' })
      updatedAt: Date;
    }
    