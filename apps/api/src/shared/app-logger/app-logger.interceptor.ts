import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createId } from '@paralleldrive/cuid2';
import type { Response } from 'express';
import { DateTime } from 'luxon';
import type { Observable } from 'rxjs';
import type { AppRequest } from '../request/app-request.interface.js';
import { AppLoggerService } from './app-logger.service.js';
import { NO_LOG_KEY } from './no-log.decorator.js';

@Injectable()
export class AppLoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly appLoggerService: AppLoggerService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    request.noLog = this.reflector.get<boolean>(NO_LOG_KEY, context.getHandler());

    const requestId = request.requestId ?? createId();
    request.requestId = requestId;
    request.timestamp = DateTime.now();
    response.setHeader('X-REQUEST-ID', requestId);

    if (!request.noLog) {
      this.appLoggerService.logHttpExchange(request, response);
    }

    return next.handle();
  }
}
