import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store.js';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isHydrated: false });
  });

  it('starts with no session and not hydrated', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isHydrated).toBe(false);
  });

  it('setSession stores the user and access token', () => {
    useAuthStore.getState().setSession({ user: { id: 'user-1', email: 'jane@example.com' }, accessToken: 'token' });

    const state = useAuthStore.getState();
    expect(state.user).toEqual({ id: 'user-1', email: 'jane@example.com' });
    expect(state.accessToken).toBe('token');
  });

  it('clearSession resets the user and access token', () => {
    useAuthStore.getState().setSession({ user: { id: 'user-1', email: 'jane@example.com' }, accessToken: 'token' });

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setHydrated flips isHydrated to true', () => {
    useAuthStore.getState().setHydrated();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});
