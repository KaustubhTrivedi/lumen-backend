// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity'; // Ensure Task entity is imported
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  // Inject the TypeORM repository for the Task entity
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Creates a new task in the database.
   * @param createTaskDto - Data for the new task.
   * @returns The newly created task entity.
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Create a new Task entity instance based on the DTO
    // TypeORM automatically handles mapping DTO properties to entity properties
    // It also handles Date conversion if the DTO provides a valid date string for a Date column.
    const newTask = this.taskRepository.create(createTaskDto);
    // Save the new entity to the database
    return this.taskRepository.save(newTask);
  }

  /**
   * Retrieves all tasks from the database.
   * @returns An array of all task entities.
   */
  async findAll(): Promise<Task[]> {
    // Find all tasks, order by creation date ascending (example)
    return this.taskRepository.find({
      order: {
        createdAt: 'ASC',
      },
    });
    // Add filtering/pagination options here later if needed
  }

  /**
   * Retrieves a single task by its ID.
   * @param id - The UUID of the task to retrieve.
   * @returns The found task entity.
   * @throws NotFoundException if no task with the given ID exists.
   */
  async findOne(id: string): Promise<Task> {
    // Find a task by its primary key (id)
    const task = await this.taskRepository.findOneBy({ id });
    // If no task is found, throw a standard NestJS NotFoundException
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return task;
  }

  /**
   * Updates an existing task.
   * @param id - The UUID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated task entity.
   * @throws NotFoundException if no task with the given ID exists.
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // 'preload' finds the entity by ID and merges the new data from the DTO onto it.
    // This is generally safer than manually finding and then updating.
    // It returns undefined if the entity with the ID is not found.
    const task = await this.taskRepository.preload({
      id: id, // The ID of the entity to load
      ...updateTaskDto, // The properties to update
    });
    // If preload didn't find the task, throw an error
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    // Save the updated entity (with merged changes) back to the database
    return this.taskRepository.save(task);
  }

  /**
   * Deletes a task by its ID.
   * @param id - The UUID of the task to delete.
   * @returns void
   * @throws NotFoundException if no task with the given ID exists.
   */
  async remove(id: string): Promise<void> {
    // Attempt to delete the task by ID
    const result = await this.taskRepository.delete(id);
    // The 'delete' method returns a DeleteResult object containing 'affected'.
    // If 'affected' is 0, it means no row was found with that ID.
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    // No explicit return needed for a successful deletion
  }
}
