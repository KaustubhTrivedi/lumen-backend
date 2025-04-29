// src/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req, // Import Req to access request object
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import the guard
import { Request } from 'express'; // Import Request type
import { JwtPayload } from '../auth/strategies/jwt.strategy'; // Import JwtPayload type
import { Task } from './entities/task.entity'; // Import Task for return types

@Controller('tasks')
@UseGuards(JwtAuthGuard) // Apply the guard to ALL routes in this controller
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Now, all methods below require a valid JWT Bearer token in the Authorization header

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: Request,
  ): Promise<Task> {
    const user = req.user as JwtPayload; // Cast to JwtPayload type
    // Pass user.sub (the user ID from JWT) as the second argument
    return this.tasksService.create(createTaskDto, user.sub);
  }

  @Get()
  findAll(@Req() req: Request): Promise<Task[]> {
    const user = req.user as JwtPayload;
    // Pass user.sub as the argument
    return this.tasksService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<Task> {
    const user = req.user as JwtPayload;
    // Pass user.sub as the second argument
    return this.tasksService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: Request, // Get request object
  ): Promise<Task> {
    const user = req.user as JwtPayload;
    // Pass user.sub as the third argument
    return this.tasksService.update(id, updateTaskDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    const user = req.user as JwtPayload;
    // Pass user.sub as the second argument
    return this.tasksService.remove(id, user.sub);
  }
}
