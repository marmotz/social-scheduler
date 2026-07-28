import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { AppLoggerExceptionFilter } from './app-logger.exception-filter.js';
import type { AppLoggerService } from './app-logger.service.js';

function createHost(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;
}

function createLoggerServiceMock() {
  return {
    formatLogLine: vi.fn().mockReturnValue('LOG_LINE'),
    formatRequestBody: vi.fn().mockReturnValue('{}'),
    log: vi.fn(),
  } as unknown as AppLoggerService;
}

describe('AppLoggerExceptionFilter', () => {
  const baseRequest = {
    method: 'GET',
    url: '/api/users',
    headers: {},
    params: {},
    query: {},
    body: {},
    get: vi.fn().mockReturnValue('vitest'),
    clientIp: '192.168.1.1',
    timestamp: DateTime.now(),
    sessionId: 'session-1',
    requestId: 'req-1',
  };

  it('re-throws HttpException after logging it as an error', () => {
    const loggerService = createLoggerServiceMock();
    const filter = new AppLoggerExceptionFilter(loggerService);
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    expect(() => filter.catch(exception, createHost(baseRequest))).toThrow(exception);
    expect(loggerService.formatLogLine).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.NOT_FOUND,
        clientIp: '192.168.1.1',
        sessionId: 'session-1',
        requestId: 'req-1',
      })
    );
    expect(loggerService.log).toHaveBeenCalledWith('error', 'LOG_LINE');
  });

  it('treats unknown exceptions as an internal server error', () => {
    const loggerService = createLoggerServiceMock();
    const filter = new AppLoggerExceptionFilter(loggerService);
    const exception = new Error('boom');

    expect(() => filter.catch(exception, createHost(baseRequest))).toThrow(exception);
    expect(loggerService.formatLogLine).toHaveBeenCalledWith(
      expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR })
    );
  });

  it('logs the request and response bodies', () => {
    const loggerService = createLoggerServiceMock();
    const filter = new AppLoggerExceptionFilter(loggerService);
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    expect(() => filter.catch(exception, createHost(baseRequest))).toThrow();

    expect(loggerService.log).toHaveBeenCalledWith('error', expect.stringContaining('Request : {}'));
    expect(loggerService.log).toHaveBeenCalledWith('error', expect.stringContaining('"statusCode": 404'));
  });
});
