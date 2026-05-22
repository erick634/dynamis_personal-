import { useDemoUserStore } from '@/stores/demo-user.store';

export function useDemoUserId(): string {
  return useDemoUserStore((state) => state.userId);
}
