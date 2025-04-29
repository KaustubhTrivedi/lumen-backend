// src/tasks/tasks.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'; // Import ForbiddenException
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Creates a new task associated with the logged-in user.
   * @param createTaskDto - Data for the new task.
   * @param userId - The ID of the user creating the task.
   * @returns The newly created task entity.
   */
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Create a new task entity instance, including the userId
    const newTask = this.taskRepository.create({
      ...createTaskDto,
      userId: userId, // Associate task with the user
    });
    // Save the new task entity to the database
    return this.taskRepository.save(newTask);
  }

  /**
   * Retrieves all tasks belonging to the specified user.
   * @param userId - The ID of the user whose tasks to retrieve.
   * @returns An array of the user's task entities.
   */
  async findAll(userId: string): Promise<Task[]> {
    // Find all tasks where the userId matches the provided ID
    return this.taskRepository.find({
      where: { userId }, // Filter by userId
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Retrieves a single task by its ID, ensuring it belongs to the specified user.
   * @param id - The UUID of the task to retrieve.
   * @param userId - The ID of the user requesting the task.
   * @returns The found task entity.
   * @throws NotFoundException if no task with the given ID exists.
   * @throws ForbiddenException if the task does not belong to the user.
   */
  async findOne(id: string, userId: string): Promise<Task> {
    // Find a task by its ID *and* userId
    const task = await this.taskRepository.findOneBy({ id, userId });
    // If task not found for this user, throw NotFoundException
    // (Avoid revealing if the task exists but belongs to someone else)
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    // No need for ForbiddenException here, as the query already filters by user
    return task;
  }

  /**
   * Updates an existing task, ensuring it belongs to the specified user.
   * @param id - The UUID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @param userId - The ID of the user attempting the update.
   * @returns The updated task entity.
   * @throws NotFoundException if no task with the given ID exists for the user.
   */
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    // First, find the task ensuring it belongs to the user
    const task = await this.findOne(id, userId); // Use findOne to check ownership first

    // If findOne didn't throw, the task exists and belongs to the user.
    // Merge the update DTO data onto the found task entity.
    // Note: preload is less useful here since we already fetched+verified the task.
    const updatedTask = this.taskRepository.merge(task, updateTaskDto);

    // Save the updated task entity
    return this.taskRepository.save(updatedTask);
  }

  /**
   * Deletes a task by its ID, ensuring it belongs to the specified user.
   * @param id - The UUID of the task to delete.
   * @param userId - The ID of the user attempting the deletion.
   * @returns void
   * @throws NotFoundException if no task with the given ID exists for the user.
   */
  async remove(id: string, userId: string): Promise<void> {
    // Attempt to delete the task matching both ID and userId
    const result = await this.taskRepository.delete({ id, userId });
    // Check if any rows were affected
    if (result.affected === 0) {
      // If 0 rows affected, the task either didn't exist or didn't belong to the user
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
  }
}
