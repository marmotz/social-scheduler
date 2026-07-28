import { describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../config/app-config.service.js';
import type { AppRequest } from '../request/app-request.interface.js';
import { SESSION_COOKIE_NAME, SessionMiddleware } from './session.middleware.js';

describe('SessionMiddleware', () => {
  const config = { isProduction: false } as unknown as AppConfigService;
  const middleware = new SessionMiddleware(config);

  it('reuses the session id from an existing cookie without setting a new one', () => {
    const request = { cookies: { [SESSION_COOKIE_NAME]: 'existing-session-id' } } as unknown as AppRequest;
    const cookie = vi.fn();
    const response = { cookie } as never;
    const next = vi.fn();

    middleware.use(request, response, next);

    expect(request.sessionId).toBe('existing-session-id');
    expect(cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('creates and stores a new session id when no cookie is present', () => {
    const request = { cookies: {} } as unknown as AppRequest;
    const cookie = vi.fn();
    const response = { cookie } as never;
    const next = vi.fn();

    middleware.use(request, response, next);

    expect(request.sessionId).toEqual(expect.any(String));
    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      request.sessionId,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
