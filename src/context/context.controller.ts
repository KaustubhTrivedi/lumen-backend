    // src/context/context.controller.ts
    import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common'; // Ensure Get, UseGuards, Req are imported
    import { LocationDto } from './dto/location.dto';
    import { ContextService } from './context.service';
    // Import the shared interface from its dedicated file
    import { McpPayload } from './interfaces/mcp.interfaces';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import JwtAuthGuard
    import { Request } from 'express'; // Import Request type
    import { JwtPayload } from '../auth/strategies/jwt.strategy'; // Import JwtPayload type

    @Controller('context') // Defines the base route for this controller as '/context'
    export class ContextController {
      private readonly logger = new Logger(ContextController.name);

      // Inject the ContextService using constructor injection
      constructor(private readonly contextService: ContextService) {}

      /**
       * POST /context/location
       * Endpoint to receive the user's current location from the frontend.
       * Delegates the handling of the location data to the ContextService.
       * Note: Currently not protected by auth, consider adding if location should be user-specific.
       * @param locationDto - Validated location data from the request body.
       * @returns A simple success message object.
       */
      // @UseGuards(JwtAuthGuard) // Uncomment to protect this route
      @Post('location')
      @HttpCode(HttpStatus.OK) // Set the HTTP status code to 200 OK for successful posts
      updateLocation(@Body() locationDto: LocationDto /*, @Req() req: Request */) {
        // const user = req.user as JwtPayload; // Get user if route is protected
        // TODO: Associate location with user if needed (pass user.sub to service)
        this.contextService.handleLocationUpdate(locationDto);
        return { message: 'Location received successfully.' };
      }

      /**
       * GET /context
       * Endpoint to retrieve the current assembled context snapshot for the logged-in user.
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
    