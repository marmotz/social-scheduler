import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRequest } from '../request/app-request.interface.js';
import { AppLoggerInterceptor } from './app-logger.interceptor.js';
import type { AppLoggerService } from './app-logger.service.js';
import { NO_LOG_KEY } from './no-log.decorator.js';

function createExecutionContext(request: AppRequest, response: Response) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('AppLoggerInterceptor', () => {
  let loggerService: AppLoggerService;
  let interceptor: AppLoggerInterceptor;
  let reflector: Reflector;
  let request: AppRequest;
  let response: Response;

  beforeEach(() => {
    loggerService = {
      logHttpExchange: vi.fn(),
    } as unknown as AppLoggerService;
    reflector = new Reflector();
    interceptor = new AppLoggerInterceptor(reflector, loggerService);
    request = { headers: {}, get: vi.fn() } as unknown as AppRequest;
    response = { setHeader: vi.fn() } as unknown as Response;
  });

  function run(noLog: boolean) {
    vi.spyOn(reflector, 'get').mockReturnValue(noLog);
    const callHandler: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(createExecutionContext(request, response), callHandler).subscribe();
  }

  it('exposes the noLog flag read from the NoLog decorator metadata key', () => {
    run(true);

    expect(reflector.get).toHaveBeenCalledWith(NO_LOG_KEY, expect.anything());
    expect(request.noLog).toBe(true);
  });

  it('sets the request id and the X-REQUEST-ID header', () => {
    run(false);

    expect(request.requestId).toEqual(expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('X-REQUEST-ID', request.requestId);
  });

  it('does not delegate to the logger when noLog is set', () => {
    run(true);

    expect(loggerService.logHttpExchange).not.toHaveBeenCalled();
  });

  it('delegates the request/response pair to the logger service', () => {
    run(false);

    expect(loggerService.logHttpExchange).toHaveBeenCalledWith(request, response);
  });
});
