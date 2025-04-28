    // src/auth/guards/local-auth.guard.ts
    import { Injectable } from '@nestjs/common';
    import { AuthGuard } from '@nestjs/passport';

    /**
     * This guard invokes the Passport 'local' strategy (LocalStrategy).
     * It triggers the validate method in LocalStrategy upon request.
     */
    @Injectable()
    export class LocalAuthGuard extends AuthGuard('local') {} // Specify 'local' strategy
    