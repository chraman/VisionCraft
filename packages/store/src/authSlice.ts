import { create } from 'zustand';
import type { User } from '@ai-platform/types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  /** Alias for setUser — sets user + marks authenticated */
  login: (user: User) => void;
  /** Alias for clearUser — clears user + marks unauthenticated */
  logout: () => void;
}

export type AuthSlice = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to prevent flash of unauthenticated state
};

export const useAuthStore = create<AuthSlice>()((set) => ({
  ...initialState,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  login: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
