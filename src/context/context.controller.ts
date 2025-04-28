// src/context/context.controller.ts
import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { LocationDto } from './dto/location.dto';
import { ContextService } from './context.service';
import { McpPayload } from './interfaces/mcp.interfaces';

@Controller('context') 
export class ContextController {
  private readonly logger = new Logger(ContextController.name);

  constructor(private readonly contextService: ContextService) {}

  @Post('location')
  @HttpCode(HttpStatus.OK)
  updateLocation(@Body() locationDto: LocationDto) {
    this.contextService.handleLocationUpdate(locationDto);
    return { message: 'Location received successfully.' };
  }

  @Get()
  async getCurrentContextSnapshot(): Promise<McpPayload> {
    this.logger.log('Request received for current context snapshot.');
    return this.contextService.buildContextSnapshot();
  }
}
