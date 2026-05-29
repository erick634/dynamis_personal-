import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CurrentUser = {
  userId: string;
  displayName: string;
  /** ISO date (YYYY-MM-DD) captured during onboarding. */
  dateOfBirth?: string;
  age?: number;
  email?: string;
};

type CurrentUserState = {
  user: CurrentUser | null;
  setUser: (user: CurrentUser) => void;
  clearUser: () => void;
};

/**
 * Persisted store for the currently active user.
 *
 * The userId is a UUID generated when the user creates their profile
 * (crypto.randomUUID()). The displayName is just for showing in the UI —
 * the backend doesn't know it (yet).
 *
 * Persisted to localStorage so refreshing the page keeps the same identity.
 */
export const useCurrentUser = create<CurrentUserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'dynamis-current-user',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
