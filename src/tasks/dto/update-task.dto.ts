// src/tasks/dto/update-task.dto.ts
import { PartialType } from '@nestjs/mapped-types'; // Use PartialType for PATCH DTOs
import { CreateTaskDto } from './create-task.dto'; // Import the CreateTaskDto
import { IsBoolean, IsOptional } from 'class-validator'; // Import necessary validators

/**
 * UpdateTaskDto extends CreateTaskDto using PartialType.
 * This makes all properties inherited from CreateTaskDto optional
 * while retaining their original validation decorators.
 * We can also add properties specific to updates.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  // Add fields that are specific to updates or need explicit handling during updates.
  // 'isComplete' is a common example.
  @IsBoolean() // Ensures the value is either true or false
  @IsOptional() // Allows this field to be omitted in the PATCH request body
  isComplete?: boolean;

  // Note: title, description, dueDate are automatically inherited as optional
  // fields with their validation rules from CreateTaskDto via PartialType.
}
