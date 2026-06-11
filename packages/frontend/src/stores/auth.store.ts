import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@claudedeck/shared';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('cd_token', token);
        set({ token, user });
      },
      clearAuth: () => {
        localStorage.removeItem('cd_token');
        set({ token: null, user: null });
      },
    }),
    {
      name: 'claudedeck-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
