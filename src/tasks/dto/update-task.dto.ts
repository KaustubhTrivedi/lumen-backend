    // src/tasks/dto/update-task.dto.ts
    import { PartialType } from '@nestjs/mapped-types'; // Used to make properties optional
    import { CreateTaskDto } from './create-task.dto'; // Base DTO
    import { IsBoolean, IsOptional, IsEnum } from 'class-validator'; // Import necessary validators
    import { TaskImportance } from '../entities/task.entity'; // Import the TaskImportance enum

    /**
     * Data Transfer Object for updating an existing task.
     * Inherits properties from CreateTaskDto (making them optional via PartialType)
     * and adds specific update fields like isComplete.
     */
    export class UpdateTaskDto extends PartialType(CreateTaskDto) {
      /**
       * Optional flag to mark the task as complete or incomplete.
       */
      @IsBoolean({ message: 'isComplete must be a boolean value (true or false)'})
      @IsOptional() // Field is not required in the request body
      isComplete?: boolean;

      /**
       * Optional importance level for the task.
       * Inherited as optional from CreateTaskDto via PartialType.
       * The @IsEnum decorator ensures that if provided, the value must be one of the allowed enum values.
       */
      @IsEnum(TaskImportance, { message: 'Importance must be one of: low, medium, high' })
      @IsOptional() // Field is not required in the request body
      importance?: TaskImportance;

      // Note: title, description, and dueDate are also implicitly included here
      // as optional fields due to extending PartialType(CreateTaskDto).
      // Their validation rules from CreateTaskDto are also inherited.
    }
    