    // src/context/context.controller.ts
    import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common'; // Ensure Get, UseGuards, Req are imported
    import { LocationDto } from './dto/location.dto';
    import { ContextService } from './context.service';
    // Import the shared interface from its dedicated file
    import { McpPayload } from './interfaces/mcp.interfaces';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
    import { Request } from 'express'; // Import Request type
    import { JwtPayload } from '../auth/strategies/jwt.strategy'; // Import JwtPayload type

    @Controller('context') // Base route /context
    export class ContextController {
      private readonly logger = new Logger(ContextController.name);

      // Inject the ContextService using constructor injection
      constructor(private readonly contextService: ContextService) {}

      /**
       * POST /context/location
       * Protected endpoint to receive the current location for the logged-in user.
       * Delegates the handling of the location data to the ContextService.
       * @param locationDto - Validated location data from the request body.
       * @param req - The Express request object, populated with JWT payload by JwtAuthGuard.
       * @returns A simple success message object.
       */
      @Post('location')
      @UseGuards(JwtAuthGuard) // ** Protect this route **
      @HttpCode(HttpStatus.OK) // Set the HTTP status code to 200 OK for successful posts
      // ** Inject Req object **
      updateLocation(@Body() locationDto: LocationDto, @Req() req: Request) {
         // ** Extract user payload **
         const user = req.user as JwtPayload;
         this.logger.log(`Received location update request for user ${user.sub}`);
         // ** Pass userId and locationDto to the service **
         this.contextService.handleLocationUpdate(user.sub, locationDto);
         // Return a simple acknowledgement response
         return { message: 'Location received successfully.' };
      }

      /**
       * GET /context
       * Protected endpoint to retrieve the current assembled context snapshot for the logged-in user.
       * Requires JWT authentication via JwtAuthGuard.
       * @param req - The Express request object, populated with user payload by the guard.
       * @returns A Promise resolving to the assembled McpPayload object containing the current context for the user.
       */
      @Get() // Handles GET requests to the base '/context' route
      @UseGuards(JwtAuthGuard) // Protect this endpoint, ensuring req.user is populated
      async getCurrentContextSnapshot(@Req() req: Request): Promise<McpPayload> { // Get Req object
         // Extract the user payload attached by JwtAuthGuard
         const user = req.user as JwtPayload;
         this.logger.log(`Request received for current context snapshot for user ${user.sub}.`);
         // Pass the authenticated user's ID (user.sub) to the service method
         return this.contextService.buildContextSnapshot(user.sub);
      }
    }
    