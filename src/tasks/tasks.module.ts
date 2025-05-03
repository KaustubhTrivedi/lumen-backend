// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service'; // Ensure service is imported
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskDependenciesModule } from 'src/task-dependencies/task-dependencies.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]),TaskDependenciesModule], // Imports the repository for Task
  controllers: [TasksController],
  providers: [TasksService], // Provides TasksService within this module
  exports: [TasksService], // <-- Add this line to export TasksService
})
export class TasksModule {}
