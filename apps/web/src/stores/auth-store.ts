import type { PublicUser } from '@sonskay/shared';
import { create } from 'zustand';

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  setSession: (session: { user: PublicUser; accessToken: string }) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
  setHydrated: () => set({ isHydrated: true }),
}));
