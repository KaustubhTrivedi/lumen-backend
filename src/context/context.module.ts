// src/context/context.module.ts
import { Module } from '@nestjs/common';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';
import { CalendarModule } from '../calendar/calendar.module'; // Import CalendarModule
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [CalendarModule, TasksModule], // Add CalendarModule here
  controllers: [ContextController],
  providers: [ContextService],
  exports: [ContextService], // Export ContextService if other modules need it
})
export class ContextModule {}
