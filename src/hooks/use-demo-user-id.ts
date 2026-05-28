import { useCurrentUser } from '@/stores/current-user';

export function useDemoUserId(): string {
  const userId = useCurrentUser((state) => state.user?.userId);
  if (!userId) {
    throw new Error('No active user — complete onboarding first.');
  }
  return userId;
}
