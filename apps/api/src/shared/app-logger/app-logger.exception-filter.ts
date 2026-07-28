import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import type { AppRequest } from '../request/app-request.interface.js';
import { AppLoggerService } from './app-logger.service.js';

@Injectable()
@Catch()
export class AppLoggerExceptionFilter implements ExceptionFilter {
  constructor(private readonly appLoggerService: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<AppRequest>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string }).message ?? 'Internal server error');

    const timestamp = DateTime.now();
    const duration = request.timestamp ? timestamp.diff(request.timestamp).milliseconds : 0;

    const log = this.appLoggerService.formatLogLine({
      method: request.method ?? 'UNKNOWN',
      url: request.url ?? '/',
      status,
      clientIp: request.clientIp,
      userAgent: request.get('user-agent') ?? '',
      duration,
      sessionId: request.sessionId,
      requestId: request.requestId,
    });

    const requestBody = this.appLoggerService.formatRequestBody(request);

    const responseBody = JSON.stringify(
      {
        responseData: {
          statusCode: status,
          message: errorMessage,
        },
      },
      undefined,
      2
    );

    this.appLoggerService.log('error', log);
    this.appLoggerService.log('error', `Request : ${requestBody}`);
    this.appLoggerService.log('error', `Response : ${responseBody}`);

    throw exception;
  }
}
