// src/context/context.module.ts
import { Module } from '@nestjs/common';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';
import { CalendarModule } from '../calendar/calendar.module';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [CalendarModule, TasksModule],
  controllers: [ContextController],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
