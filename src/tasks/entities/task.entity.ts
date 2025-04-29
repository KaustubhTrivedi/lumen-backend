// src/tasks/entities/task.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne, // Import ManyToOne decorator
  JoinColumn, // Import JoinColumn decorator
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Import the User entity

@Entity('tasks') // Specifies the table name 'tasks' in the database
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

  // --- Add User Relationship ---
  @Column({ type: 'uuid' }) // Column to store the User's ID (foreign key)
  @Index() // Index the foreign key for faster lookups
  userId: string;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' }) // Define the relationship
  @JoinColumn({ name: 'userId' }) // Specify the foreign key column name
  user: User; // Property to access the related User object (optional loading)
  // --- End User Relationship ---

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
