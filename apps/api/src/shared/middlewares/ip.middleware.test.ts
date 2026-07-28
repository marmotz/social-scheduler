import { describe, expect, it, vi } from 'vitest';
import type { AppRequest } from '../request/app-request.interface.js';
import { IpMiddleware } from './ip.middleware.js';

function createRequest(overrides: Partial<AppRequest> = {}): AppRequest {
  return {
    headers: {},
    socket: {},
    ...overrides,
  } as AppRequest;
}

describe('IpMiddleware', () => {
  const middleware = new IpMiddleware();

  it('extracts the IP from x-forwarded-for', () => {
    const request = createRequest({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } });
    const next = vi.fn();

    middleware.use(request, {} as never, next);

    expect(request.clientIp).toBe('203.0.113.5');
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to the socket remote address when no header is valid', () => {
    const request = createRequest({ socket: { remoteAddress: '198.51.100.2' } as never });
    const next = vi.fn();

    middleware.use(request, {} as never, next);

    expect(request.clientIp).toBe('198.51.100.2');
  });

  it('ignores headers with an invalid IP', () => {
    const request = createRequest({
      headers: { 'x-forwarded-for': 'not-an-ip' },
      socket: { remoteAddress: '198.51.100.2' } as never,
    });
    const next = vi.fn();

    middleware.use(request, {} as never, next);

    expect(request.clientIp).toBe('198.51.100.2');
  });

  it('returns null when no IP can be determined', () => {
    const request = createRequest();
    const next = vi.fn();

    middleware.use(request, {} as never, next);

    expect(request.clientIp).toBeNull();
  });
});
