    // src/task-dependencies/dto/create-task-dependency.dto.ts
    import { IsNotEmpty, IsUUID } from 'class-validator';

    /**
     * DTO for creating a new task dependency.
     * Note: In our current implementation, dependencies are learned automatically,
     * so this DTO might only be used if manual creation is added later.
     */
    export class CreateTaskDependencyDto {
      // We might get userId from the authenticated request instead of the body
      // @IsUUID()
      // @IsNotEmpty()
      // userId: string;

      @IsUUID('4', { message: 'blockingTaskId must be a valid UUID' })
      @IsNotEmpty({ message: 'blockingTaskId cannot be empty' })
      blockingTaskId: string;

      @IsUUID('4', { message: 'dependentTaskId must be a valid UUID' })
      @IsNotEmpty({ message: 'dependentTaskId cannot be empty' })
      dependentTaskId: string;

      // Add other fields like 'confidence' if needed later
    }
    