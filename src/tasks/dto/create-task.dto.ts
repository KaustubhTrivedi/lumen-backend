    // src/tasks/dto/create-task.dto.ts
    import {
      IsString,
      IsNotEmpty,
      IsOptional,
      IsDateString,
      MaxLength,
      IsEnum, // Import IsEnum validator
    } from 'class-validator';
    import { TaskImportance } from '../entities/task.entity'; // Import the enum

    /**
     * Data Transfer Object for creating a new task.
     * Defines the expected shape and validation rules for the request body.
     */
    export class CreateTaskDto {
      @IsString({ message: 'Title must be a string' })
      @IsNotEmpty({ message: 'Title cannot be empty' })
      @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
      title: string;

      @IsString()
      @IsOptional() // Description is not required
      description?: string;

      @IsDateString({}, { message: 'dueDate must be a valid ISO 8601 date string' })
      @IsOptional() // Due date is not required
      dueDate?: string;

      /**
       * Optional importance level for the task.
       * If not provided, the entity default ('medium') will be used.
       */
      @IsEnum(TaskImportance, { message: 'Importance must be one of: low, medium, high' })
      @IsOptional() // Importance is not required on creation
      importance?: TaskImportance;
    }
    