// src/tasks/tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { NotFoundException } from '@nestjs/common';

// Define a type for our mock repository to make it easier to work with
type MockRepository<T extends object = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// Factory function to create a mock repository
const createMockRepository = <T extends object = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  preload: jest.fn(),
  delete: jest.fn(),
});

describe('TasksService', () => {
  let service: TasksService;
  let repository: MockRepository<Task>;

  // Sample task data for testing
  const mockTaskId = 'some-uuid-123';
  const mockTask: Task = {
    id: mockTaskId,
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date(),
    isComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create a testing module similar to AppModule, but providing mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService, // The actual service we want to test
        {
          provide: getRepositoryToken(Task), // Provide the token for Task's repository
          useValue: createMockRepository(), // Use our mock repository factory
        },
      ],
    }).compile();

    // Get instances of the service and the mock repository from the testing module
    service = module.get<TasksService>(TasksService);
    repository = module.get<MockRepository<Task>>(getRepositoryToken(Task));
  });

  // Test suite for the create method
  describe('create', () => {
    it('should create and save a new task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Desc',
      };
      // Mock what repository.create returns (usually the entity object based on DTO)
      repository.create!.mockReturnValue(createTaskDto as any); // Cast needed as it's partial
      // Mock what repository.save returns (usually the saved entity with id, timestamps)
      repository.save!.mockResolvedValue({ ...mockTask, ...createTaskDto });

      const result = await service.create(createTaskDto);

      expect(repository.create).toHaveBeenCalledWith(createTaskDto);
      expect(repository.save).toHaveBeenCalledWith(createTaskDto); // Save is called with the created object
      expect(result).toEqual({ ...mockTask, ...createTaskDto });
    });
  });

  // Test suite for the findAll method
  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const tasksArray = [mockTask];
      repository.find!.mockResolvedValue(tasksArray); // Mock find to return our sample array

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
      expect(result).toEqual(tasksArray);
    });
  });

  // Test suite for the findOne method
  describe('findOne', () => {
    it('should return a single task if found', async () => {
      repository.findOneBy!.mockResolvedValue(mockTask); // Mock findOneBy to return our sample task

      const result = await service.findOne(mockTaskId);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: mockTaskId });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task is not found', async () => {
      repository.findOneBy?.mockResolvedValue(null); // Mock findOneBy to return null

      // Expect the promise returned by service.findOne to be rejected with NotFoundException
      await expect(service.findOne(mockTaskId)).rejects.toThrow(NotFoundException);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: mockTaskId });
    });
  });

  // Test suite for the update method
  describe('update', () => {
    it('should update and return the task if found', async () => {
        const updateTaskDto: UpdateTaskDto = { description: "Updated Desc", isComplete: true };
        const preloadedTask = { ...mockTask }; // Simulate what preload returns
        const savedTask = { ...mockTask, ...updateTaskDto }; // Simulate the saved result

        repository.preload!.mockResolvedValue(preloadedTask); // Mock preload finding the task
        repository.save!.mockResolvedValue(savedTask); // Mock save returning the updated task

        const result = await service.update(mockTaskId, updateTaskDto);

        expect(repository.preload).toHaveBeenCalledWith({ id: mockTaskId, ...updateTaskDto });
        expect(repository.save).toHaveBeenCalledWith(preloadedTask); // Save is called with the preloaded+merged object
        expect(result).toEqual(savedTask);
    });

    it('should throw NotFoundException if task to update is not found', async () => {
        const updateTaskDto: UpdateTaskDto = { description: "Updated Desc" };
        repository.preload?.mockResolvedValue(undefined); // Mock preload not finding the task

        await expect(service.update(mockTaskId, updateTaskDto)).rejects.toThrow(NotFoundException);
        expect(repository.preload).toHaveBeenCalledWith({ id: mockTaskId, ...updateTaskDto });
        expect(repository.save).not.toHaveBeenCalled(); // Ensure save wasn't called
    });
  });

   // Test suite for the remove method
   describe('remove', () => {
    it('should remove the task if found', async () => {
        // Mock delete returning a result indicating 1 row affected
        repository.delete!.mockResolvedValue({ affected: 1, raw: {} });

        await service.remove(mockTaskId); // remove returns void on success

        expect(repository.delete).toHaveBeenCalledWith(mockTaskId);
    });

    it('should throw NotFoundException if task to remove is not found', async () => {
        // Mock delete returning a result indicating 0 rows affected
        repository.delete?.mockResolvedValue({ affected: 0, raw: {} });

        await expect(service.remove(mockTaskId)).rejects.toThrow(NotFoundException);
        expect(repository.delete).toHaveBeenCalledWith(mockTaskId);
    });
  });

});
