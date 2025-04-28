import { Controller } from '@nestjs/common';
import { OauthTokenService } from './oauth-token.service';

@Controller('oauth-token')
export class OauthTokenController {
  constructor(private readonly oauthTokenService: OauthTokenService) {}
}
