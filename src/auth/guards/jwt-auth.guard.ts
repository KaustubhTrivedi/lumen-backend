    // src/auth/guards/jwt-auth.guard.ts
    import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
    import { AuthGuard } from '@nestjs/passport';
    import { Observable } from 'rxjs';

    /**
     * This guard invokes the Passport 'jwt' strategy (JwtStrategy).
     * It validates the JWT found in the request's Authorization header.
     * If valid, it attaches the payload (from JwtStrategy.validate) to request.user.
     */
    @Injectable()
    export class JwtAuthGuard extends AuthGuard('jwt') { // Specify the 'jwt' strategy

      // Optional: Override handleRequest to customize error handling or logic after validation
      handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
         if (err || !user) {
            // Log the error or info for debugging if needed
            // console.error('JWT Auth Error:', err || info?.message);
            throw err || new UnauthorizedException(info?.message || 'Invalid or expired token');
         }
         // If validation is successful, 'user' contains the payload returned by JwtStrategy.validate
         return user;
      }
    }
    