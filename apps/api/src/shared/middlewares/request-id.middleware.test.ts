import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { AppLogger } from '../app-logger/app-logger.js';
import type { AppRequest } from '../request/app-request.interface.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

describe('RequestIdMiddleware', () => {
  it('assigns a request id, a timestamp and the X-REQUEST-ID header', () => {
    const middleware = new RequestIdMiddleware();
    const request = {} as AppRequest;
    const setHeader = vi.fn();
    const response = { setHeader } as never;
    const next = vi.fn();

    middleware.use(request, response, next);

    expect(request.requestId).toEqual(expect.any(String));
    expect(request.requestId).toHaveLength(24);
    expect(DateTime.isDateTime(request.timestamp)).toBe(true);
    expect(setHeader).toHaveBeenCalledWith('X-REQUEST-ID', request.requestId);
    expect(AppLogger.currentRequestId).toBe(request.requestId);
    expect(next).toHaveBeenCalledOnce();
  });
});
