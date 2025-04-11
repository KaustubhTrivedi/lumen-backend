import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import {TypeOrmModule} from '@nestjs/typeorm'
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
