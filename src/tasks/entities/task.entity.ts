// src/tasks/entities/task.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tasks') // Specifies the table name 'tasks' in the database
export class Task {
  @PrimaryGeneratedColumn('uuid') // Defines 'id' as the primary key (UUID)
  id: string;

  @Column({ type: 'varchar', length: 255 }) // Defines 'title' column
  title: string;

  @Column({ type: 'text', nullable: true }) // Defines 'description' column (optional)
  description: string | null;

  @Index() // Adds an index to the 'dueDate' column for faster queries
  @Column({ type: 'timestamp with time zone', nullable: true }) // Defines 'dueDate' (optional)
  dueDate: Date | null;

  @Column({ type: 'boolean', default: false }) // Defines 'isComplete' column
  isComplete: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' }) // Automatically sets creation timestamp
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' }) // Automatically sets update timestamp
  updatedAt: Date;

  // Add relations to User or other entities here later if needed
}
