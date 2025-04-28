// src/tasks/dto/create-task.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString, // Use IsDateString if you expect ISO date strings
  MaxLength,
  // Add IsArray, IsString for tags if you implement them later
} from 'class-validator';

export class CreateTaskDto {
  @IsString() // Value must be a string
  @IsNotEmpty() // Value cannot be empty
  @MaxLength(255) // Maximum length constraint
  title: string;

  @IsString()
  @IsOptional() // Value can be omitted from the request body
  description?: string; // Mark as optional in TypeScript too

  @IsDateString() // Value must be a valid ISO 8601 date string (e.g., "2025-12-31T18:30:00.000Z")
  @IsOptional()
  dueDate?: string; // Keep as string, TypeORM/DB driver handles conversion

  // Example for tags if added later:
  // @IsArray()
  // @IsString({ each: true }) // Validates each element in the array is a string
  // @IsOptional()
  // tags?: string[];
}
