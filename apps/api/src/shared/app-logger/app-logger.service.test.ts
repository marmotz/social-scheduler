import type { Response } from 'express';
import { DateTime } from 'luxon';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppRequest } from '../request/app-request.interface.js';
import { AppLoggerService } from './app-logger.service.js';

function createResponse() {
  const listeners: Record<string, () => void> = {};

  return {
    statusCode: 200,
    write: vi.fn().mockReturnValue(true),
    end: vi.fn().mockReturnValue(true),
    get: vi.fn().mockReturnValue('4'),
    on: vi.fn((event: string, handler: () => void) => {
      listeners[event] = handler;
    }),
    emitClose: () => listeners.close?.(),
  } as unknown as Response & { emitClose: () => void };
}

function createRequest(overrides: Partial<AppRequest> = {}): AppRequest {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    get: vi.fn().mockReturnValue('vitest'),
    clientIp: '127.0.0.1',
    method: 'GET',
    url: '/trpc/auth.login',
    timestamp: DateTime.now(),
    sessionId: 'session-1',
    requestId: 'req-1',
    ...overrides,
  } as unknown as AppRequest;
}

describe('AppLoggerService', () => {
  const service = new AppLoggerService();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeData', () => {
    it('redacts sensitive fields recursively', () => {
      const result = service.sanitizeData({
        email: 'jane@example.com',
        password: 'secret123',
        nested: { token: 'abc', keep: 'value' },
      });

      expect(result).toEqual({
        email: 'jane@example.com',
        password: '[REDACTED]',
        nested: { token: '[REDACTED]', keep: 'value' },
      });
    });

    it('returns falsy input unchanged', () => {
      expect(service.sanitizeData(null)).toBeNull();
    });
  });

  describe('sanitizeHeaders', () => {
    it('redacts known sensitive headers case-insensitively', () => {
      const result = service.sanitizeHeaders({ Authorization: 'Bearer xyz', 'x-other': 'value' });

      expect(result).toEqual({ Authorization: '[SECRET]', 'x-other': 'value' });
    });

    it('returns an empty object when headers are missing', () => {
      expect(service.sanitizeHeaders(undefined)).toEqual({});
    });
  });

  describe('formatRequestBody', () => {
    it('omits empty fields and includes the sanitized user and session', () => {
      const request = {
        headers: {},
        params: {},
        query: {},
        sessionId: 'session-1',
        user: { id: 'user-1', email: 'jane@example.com' },
        body: { password: 'secret' },
      } as unknown as AppRequest;

      const result = JSON.parse(service.formatRequestBody(request));

      expect(result).toEqual({
        user: { id: 'user-1', email: 'jane@example.com' },
        sessionId: 'session-1',
        body: { password: '[REDACTED]' },
      });
    });

    it('omits the user field when the request is unauthenticated', () => {
      const request = { headers: {}, params: {}, query: {}, body: {} } as unknown as AppRequest;

      const result = JSON.parse(service.formatRequestBody(request));

      expect(result.user).toBeUndefined();
    });
  });

  describe('formatLogLine', () => {
    it('formats a readable log line with a human content length', () => {
      const line = service.formatLogLine({
        method: 'GET',
        url: '/health',
        status: 200,
        clientIp: '127.0.0.1',
        userAgent: 'vitest',
        duration: 12,
        contentLength: 2048,
        sessionId: 'session-1',
        requestId: 'req-1',
      });

      expect(line).toBe('[session-1 > req-1] GET /health 200 2ko - 127.0.0.1 vitest - 12ms');
    });

    it('falls back to "unknown" and "none" when the client IP, session id and request id are missing', () => {
      const line = service.formatLogLine({
        method: 'GET',
        url: '/health',
        status: 200,
        clientIp: null,
        userAgent: 'vitest',
        duration: 1,
      });

      expect(line).toContain('[none > unknown]');
      expect(line).toContain('unknown');
      expect(line).toContain('0o');
    });
  });

  describe('log', () => {
    it('delegates to the underlying Nest logger', () => {
      const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

      service.log('log', 'hello');

      expect(logSpy).toHaveBeenCalledWith('hello');
    });
  });

  describe('logHttpExchange', () => {
    it('logs a single line on close for a successful response', () => {
      const logSpy = vi.spyOn(service, 'log');
      const request = createRequest();
      const response = createResponse();

      service.logHttpExchange(request, response);
      response.emitClose();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        'log',
        expect.stringContaining('[session-1 > req-1] GET /trpc/auth.login 200')
      );
    });

    it('also logs the request and response bodies when the response is an error', () => {
      const logSpy = vi.spyOn(service, 'log');
      const request = createRequest();
      const response = createResponse();
      response.statusCode = 500;

      service.logHttpExchange(request, response);
      response.write('{"message"');
      response.write(':"boom"}');
      response.emitClose();

      expect(logSpy).toHaveBeenCalledTimes(3);
      expect(logSpy).toHaveBeenNthCalledWith(1, 'error', expect.stringContaining('GET /trpc/auth.login 500'));
      expect(logSpy).toHaveBeenNthCalledWith(2, 'error', expect.any(String));
      expect(logSpy).toHaveBeenNthCalledWith(3, 'error', expect.stringContaining('boom'));
    });

    it('routes requests to /trpc the same way as any other request', () => {
      const logSpy = vi.spyOn(service, 'log');
      const request = createRequest({ url: '/trpc/auth.login', method: 'POST' } as Partial<AppRequest>);
      const response = createResponse();

      service.logHttpExchange(request, response);
      response.emitClose();

      expect(logSpy).toHaveBeenCalledWith('log', expect.stringContaining('POST /trpc/auth.login'));
    });
  });
});
