import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { PublicUser } from '@sonskay/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AccessTokenPayload } from '../auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    });
  }

  validate(payload: AccessTokenPayload): PublicUser {
    return { id: payload.sub, email: payload.email };
  }
}
