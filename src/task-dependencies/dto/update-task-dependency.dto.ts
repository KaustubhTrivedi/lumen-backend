    // src/task-dependencies/dto/update-task-dependency.dto.ts
    import { PartialType } from '@nestjs/mapped-types';
    import { CreateTaskDependencyDto } from './create-task-dependency.dto';
    // Add other relevant validators if update allows changing specific fields like 'confidence'
    // import { IsNumber, IsOptional } from 'class-validator';

    /**
     * DTO for updating a task dependency.
     * Inherits properties from CreateTaskDependencyDto and makes them optional.
     * Note: Updating learned dependencies might not be a primary feature.
     */
    export class UpdateTaskDependencyDto extends PartialType(CreateTaskDependencyDto) {
        // Example: Allow updating confidence score if implemented
        // @IsNumber()
        // @IsOptional()
        // confidence?: number;
    }
    