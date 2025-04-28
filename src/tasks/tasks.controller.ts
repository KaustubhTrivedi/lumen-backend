    // src/tasks/tasks.controller.ts
    import {
      Controller,
      Get,
      Post,
      Body,
      Patch,
      Param,
      Delete,
      ParseUUIDPipe,
      HttpCode,
      HttpStatus,
      UseGuards, // Import UseGuards
      Req, // Import Req to access request object
    } from '@nestjs/common';
    import { TasksService } from './tasks.service';
    import { CreateTaskDto } from './dto/create-task.dto';
    import { UpdateTaskDto } from './dto/update-task.dto';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import the guard
    import { Request } from 'express'; // Import Request type
    import { JwtPayload } from '../auth/strategies/jwt.strategy'; // Import JwtPayload type

    @Controller('tasks')
    @UseGuards(JwtAuthGuard) // Apply the guard to ALL routes in this controller
    export class TasksController {
      constructor(private readonly tasksService: TasksService) {}

      // Now, all methods below require a valid JWT Bearer token in the Authorization header

      @Post()
      @HttpCode(HttpStatus.CREATED)
      // Access the user info attached by the guard using @Req()
      create(@Body() createTaskDto: CreateTaskDto, @Req() req: Request) {
        // req.user contains the payload returned by JwtStrategy.validate
        const user = req.user as JwtPayload; // Cast to JwtPayload type
        console.log(`Creating task for user ID: ${user.sub}`); // user.sub is the user ID
        // TODO: Modify TasksService.create to accept and use the userId (user.sub)
        return this.tasksService.create(createTaskDto /*, user.sub */);
      }

      @Get()
      findAll(@Req() req: Request) {
        const user = req.user as JwtPayload;
        console.log(`Fetching tasks for user ID: ${user.sub}`);
        // TODO: Modify TasksService.findAll to filter by userId (user.sub)
        return this.tasksService.findAll(/* user.sub */);
      }

      @Get(':id')
      findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const user = req.user as JwtPayload;
        console.log(`Fetching task ${id} for user ID: ${user.sub}`);
        // TODO: Modify TasksService.findOne to check ownership (userId == user.sub)
        return this.tasksService.findOne(id /*, user.sub */);
      }

      @Patch(':id')
      update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTaskDto: UpdateTaskDto,
        @Req() req: Request,
      ) {
        const user = req.user as JwtPayload;
        console.log(`Updating task ${id} for user ID: ${user.sub}`);
        // TODO: Modify TasksService.update to check ownership (userId == user.sub)
        return this.tasksService.update(id, updateTaskDto /*, user.sub */);
      }

      @Delete(':id')
      @HttpCode(HttpStatus.NO_CONTENT)
      remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const user = req.user as JwtPayload;
        console.log(`Deleting task ${id} for user ID: ${user.sub}`);
        // TODO: Modify TasksService.remove to check ownership (userId == user.sub)
        return this.tasksService.remove(id /*, user.sub */);
      }
    }
    