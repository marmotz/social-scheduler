import { Injectable, type NestMiddleware } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import type { NextFunction, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AppRequest } from '../request/app-request.interface.js';

export const SESSION_COOKIE_NAME = 'sonskay_session_id';
const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Assigns a stable session id (cookie-based) so log lines and metrics for a
 * given browser session can be correlated, independently of the JWT access
 * token lifetime.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfigService) {}

  use(request: AppRequest, response: Response, next: NextFunction) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const sessionId = cookies?.[SESSION_COOKIE_NAME] ?? createId();

    request.sessionId = sessionId;

    if (!cookies?.[SESSION_COOKIE_NAME]) {
      response.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: this.config.isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE_MS,
      });
    }

    next();
  }
}
