import { Injectable, type NestMiddleware } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import type { NextFunction, Response } from 'express';
import { DateTime } from 'luxon';
import { AppLogger } from '../app-logger/app-logger.js';
import type { AppRequest } from '../request/app-request.interface.js';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: AppRequest, response: Response, next: NextFunction) {
    const requestId = createId();

    request.requestId = requestId;
    request.timestamp = DateTime.now();
    response.setHeader('X-REQUEST-ID', requestId);
    AppLogger.currentRequestId = requestId;

    next();
  }
}
