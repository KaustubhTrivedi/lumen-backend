// src/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe, // Pipe to validate UUID parameters
  HttpCode,
  HttpStatus, // Enum for HTTP status codes
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity'; // Import Task entity for return types

// Define the base route for this controller as '/tasks'
@Controller('tasks')
export class TasksController {
  // Inject the TasksService
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Endpoint to create a new task.
   * POST /tasks
   * @param createTaskDto - Validated data from the request body.
   * @returns The newly created task.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED) // Set response status code to 201 Created
  create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    // The @Body() decorator extracts the request body.
    // The ValidationPipe (configured globally in main.ts) automatically validates it against CreateTaskDto.
    return this.tasksService.create(createTaskDto);
  }

  /**
   * Endpoint to retrieve all tasks.
   * GET /tasks
   * @returns An array of all tasks.
   */
  @Get()
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  /**
   * Endpoint to retrieve a single task by ID.
   * GET /tasks/:id
   * @param id - The UUID passed in the URL path.
   * @returns The found task.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    // @Param('id') extracts the 'id' parameter from the URL.
    // ParseUUIDPipe ensures the 'id' parameter is a valid UUID string before it reaches the service.
    return this.tasksService.findOne(id);
  }

  /**
   * Endpoint to update an existing task.
   * PATCH /tasks/:id
   * @param id - The UUID of the task to update.
   * @param updateTaskDto - Validated data containing the fields to update.
   * @returns The updated task.
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    // The @Body() decorator extracts the request body.
    // The ValidationPipe validates it against UpdateTaskDto.
    return this.tasksService.update(id, updateTaskDto);
  }

  /**
   * Endpoint to delete a task by ID.
   * DELETE /tasks/:id
   * @param id - The UUID of the task to delete.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Set response status code to 204 No Content
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    // The service method returns Promise<void> and handles NotFoundException.
    // If successful, NestJS sends a 204 response automatically due to @HttpCode.
    return this.tasksService.remove(id);
  }
}
